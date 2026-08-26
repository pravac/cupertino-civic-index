/**
 * Reads Cupertino's public Legistar calendar page.
 *
 * This exists because the Legistar Web API does not report every cancellation.
 * Staff cancel a meeting in one of two ways, and only one reaches the API:
 *
 *   1. A note in the free-text comment field, which the API exposes as
 *      EventComment. The August 18 council meeting used this.
 *   2. Replacing the published agenda with a document titled "Cancellation
 *      Notice", which the API does not expose at all. Cupertino's
 *      EventAgendaFile is null for every meeting, so the document title is
 *      only visible in the calendar HTML. Both August Planning Commission
 *      cancellations used this.
 *
 * Missing case 2 means telling residents a canceled meeting is still on, which
 * is the single worst error this site could make. Hence reading the page.
 *
 * Note this is an ordinary public page that serves automated requests without
 * objection. Nothing here evades an access control.
 */
const CALENDAR_URL = "https://cupertino.legistar.com/Calendar.aspx";
const TIMEOUT_MS = 8_000;
const REVALIDATE = 900;

export interface CalendarRow {
  body: string;
  /** ISO calendar date, e.g. "2026-08-25". */
  date: string;
  time: string | null;
  canceled: boolean;
  /** Label shown in the agenda column, e.g. "Agenda" or "Cancellation Notice". */
  agendaLabel: string | null;
}

/** Composite key, because the calendar page and the API use different ID
 *  spaces and share no common identifier. */
export function meetingKey(body: string, isoDate: string, time: string | null): string {
  return `${body.trim().toLowerCase()}|${isoDate}|${(time ?? "").trim().toUpperCase()}`;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function toIsoDate(usDate: string): string | null {
  const m = usDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseCalendarHtml(htmlText: string): CalendarRow[] {
  const rows: CalendarRow[] = [];
  for (const tr of htmlText.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const cells = (tr.match(/<td[^>]*>[\s\S]*?<\/td>/g) ?? []).map((c) => decode(stripTags(c)));
    if (cells.length < 3) continue;

    const rowText = decode(stripTags(tr));
    const dateMatch = rowText.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
    if (!dateMatch) continue;
    const date = toIsoDate(dateMatch[1]);
    if (!date) continue;

    const body = cells[0]?.trim();
    if (!body) continue;

    const timeMatch = rowText.match(/\b(\d{1,2}:\d{2}\s*[AP]M)\b/i);
    const canceled = /cancellation notice/i.test(rowText) || /\bcanceled\b/i.test(rowText);

    let agendaLabel: string | null = null;
    if (/cancellation notice/i.test(rowText)) agendaLabel = "Cancellation Notice";
    else if (/amended agenda/i.test(rowText)) agendaLabel = "Amended Agenda";
    else if (/\bagenda\b/i.test(rowText)) agendaLabel = "Agenda";

    rows.push({
      body,
      date,
      time: timeMatch ? timeMatch[1].toUpperCase().replace(/\s+/g, " ") : null,
      canceled,
      agendaLabel,
    });
  }
  return rows;
}

/**
 * Cancellation lookup keyed by body, date and time. Returns an empty map on any
 * failure so the API data still renders; a missing scrape must never take the
 * site down.
 */
export async function getCalendarOverlay(): Promise<Map<string, CalendarRow>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CALENDAR_URL, {
      signal: controller.signal,
      headers: {
        // Legistar serves a trimmed page to unrecognized agents.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`Calendar page responded ${res.status}`);
    const map = new Map<string, CalendarRow>();
    for (const row of parseCalendarHtml(await res.text())) {
      map.set(meetingKey(row.body, row.date, row.time), row);
      // Time is the least reliable field to match on, so keep a fallback key.
      map.set(meetingKey(row.body, row.date, null), row);
    }
    return map;
  } catch {
    return new Map();
  } finally {
    clearTimeout(timer);
  }
}
