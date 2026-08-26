/**
 * Client for the Legistar Web API — the same system Cupertino staff use to
 * publish agendas. It is public and unauthenticated, so everything here is
 * genuinely live city data rather than a copy that drifts out of date.
 *
 * Docs: https://webapi.legistar.com/Help
 */
import type { AgendaItem, GoverningBody, Meeting, Sourced } from "./types";
import { todayInCupertino } from "./format";

const BASE = "https://webapi.legistar.com/v1/cupertino";

/** Legistar is a third party; never let a slow response hang a page render. */
const TIMEOUT_MS = 8_000;

/** Cache window in seconds. Agendas change on staff timelines, not minutes. */
const REVALIDATE = 900;

export const COUNCIL_BODY_ID = 138;

interface RawEvent {
  EventId: number;
  EventBodyId: number;
  EventBodyName: string;
  EventDate: string;
  EventTime: string | null;
  EventLocation: string | null;
  EventAgendaFile: string | null;
  EventMinutesFile: string | null;
  EventVideoPath: string | null;
  EventInSiteURL: string;
  EventAgendaStatusName: string | null;
  EventMinutesStatusName: string | null;
}

interface RawEventItem {
  EventItemId: number;
  EventItemAgendaSequence: number | null;
  EventItemTitle: string | null;
  EventItemMatterFile: string | null;
  EventItemMatterType: string | null;
  EventItemActionName: string | null;
}

interface RawBody {
  BodyId: number;
  BodyName: string;
  BodyTypeName: string;
  BodyNumberOfMembers: number;
  BodyActiveFlag: number;
  BodyMeetFlag: number;
}

async function legistarFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) {
      throw new Error(`Legistar responded ${res.status} for ${path}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function toMeeting(e: RawEvent): Meeting {
  return {
    id: e.EventId,
    body: e.EventBodyName,
    bodyId: e.EventBodyId,
    date: e.EventDate,
    time: e.EventTime,
    location: e.EventLocation,
    agendaUrl: e.EventAgendaFile,
    minutesUrl: e.EventMinutesFile,
    videoUrl: e.EventVideoPath,
    detailUrl: e.EventInSiteURL,
    agendaStatus: e.EventAgendaStatusName,
    minutesStatus: e.EventMinutesStatusName,
    hasAgenda: Boolean(e.EventAgendaFile),
    hasMinutes: Boolean(e.EventMinutesFile),
  };
}

function wrap<T>(data: T, error?: unknown): Sourced<T> {
  return {
    data,
    health: error ? "unavailable" : "live",
    origin: "Legistar (City of Cupertino)",
    fetchedAt: new Date().toISOString(),
    error: error ? String(error) : undefined,
  };
}

/** Meetings on or after today, soonest first. */
export async function getUpcomingMeetings(limit = 12): Promise<Sourced<Meeting[]>> {
  const today = todayInCupertino();
  const filter = `EventDate ge datetime'${today}'`;
  try {
    const raw = await legistarFetch<RawEvent[]>(
      `/events?$filter=${encodeURIComponent(filter)}&$orderby=EventDate&$top=${limit}`,
    );
    return wrap(raw.map(toMeeting));
  } catch (err) {
    return wrap([] as Meeting[], err);
  }
}

/** Meetings strictly before today, most recent first. */
export async function getPastMeetings(limit = 12, bodyId?: number): Promise<Sourced<Meeting[]>> {
  const today = todayInCupertino();
  const clauses = [`EventDate lt datetime'${today}'`];
  if (bodyId) clauses.push(`EventBodyId eq ${bodyId}`);
  const filter = clauses.join(" and ");
  try {
    const raw = await legistarFetch<RawEvent[]>(
      `/events?$filter=${encodeURIComponent(filter)}&$orderby=EventDate desc&$top=${limit}`,
    );
    return wrap(raw.map(toMeeting));
  } catch (err) {
    return wrap([] as Meeting[], err);
  }
}

export async function getMeeting(id: number): Promise<Sourced<Meeting | null>> {
  try {
    const raw = await legistarFetch<RawEvent>(`/events/${id}`);
    return wrap(toMeeting(raw));
  } catch (err) {
    return wrap(null, err);
  }
}

/** Rows that structure a meeting but carry no decision. Hidden by default so
 *  residents see substance instead of "PLEDGE OF ALLEGIANCE". */
const PROCEDURAL = new Set([
  "CALL TO ORDER",
  "ROLL CALL",
  "PLEDGE OF ALLEGIANCE",
  "ADJOURNMENT",
  "CLOSED SESSION REPORT",
  "CEREMONIAL ITEMS",
  "POSTPONEMENTS",
  "ORAL COMMUNICATIONS",
  "CONSENT CALENDAR",
  "PUBLIC HEARINGS",
  "ACTION CALENDAR",
  "ORDINANCES AND ACTION ITEMS",
  "COUNCIL AND STAFF COMMENTS AND FUTURE AGENDA ITEMS",
  "STUDY SESSION",
  "REPORTS BY COUNCIL AND STAFF",
  "APPROVAL OF MINUTES",
]);

function isProcedural(title: string): boolean {
  const t = title.trim().toUpperCase();
  if (PROCEDURAL.has(t)) return true;
  // Long all-caps blocks are participation boilerplate repeated each meeting.
  if (t.length > 120 && t === title.trim() && !title.includes("Subject:")) return true;
  return false;
}

export async function getAgendaItems(eventId: number): Promise<Sourced<AgendaItem[]>> {
  try {
    const raw = await legistarFetch<RawEventItem[]>(`/events/${eventId}/eventitems?Attachments=1`);
    const items = raw
      .filter((i) => (i.EventItemTitle ?? "").trim().length > 0)
      .map((i, idx) => {
        const title = (i.EventItemTitle ?? "").replace(/\s+/g, " ").trim();
        return {
          id: i.EventItemId,
          order: i.EventItemAgendaSequence ?? idx,
          // Staff prefix substantive items with "Subject:" — drop the label.
          title: title.replace(/^Subject:\s*/i, ""),
          matterFile: i.EventItemMatterFile,
          matterType: i.EventItemMatterType,
          action: i.EventItemActionName,
          procedural: isProcedural(title),
        } satisfies AgendaItem;
      })
      .sort((a, b) => a.order - b.order);
    return wrap(items);
  } catch (err) {
    return wrap([] as AgendaItem[], err);
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Legistar carries container rows used to group joint meetings. They are not
 *  bodies a resident can join, so they are hidden from the commission list. */
const NON_BODIES = new Set([
  "All Commissions",
  "Parks & Rec. and Bicycle Ped. Commissions",
  "City Strategic Partnership Meetings",
]);

export async function getBodies(): Promise<Sourced<GoverningBody[]>> {
  try {
    const raw = await legistarFetch<RawBody[]>("/bodies");
    const bodies = raw
      .filter((b) => b.BodyActiveFlag === 1 && b.BodyMeetFlag === 1)
      .filter((b) => !NON_BODIES.has(b.BodyName.trim()))
      .map((b) => ({
        id: b.BodyId,
        name: b.BodyName.trim(),
        type: b.BodyTypeName,
        memberCount: b.BodyNumberOfMembers,
        slug: slugify(b.BodyName),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return wrap(bodies);
  } catch (err) {
    return wrap([] as GoverningBody[], err);
  }
}
