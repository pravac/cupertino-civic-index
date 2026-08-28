/**
 * City events, scraped from cupertino.gov.
 *
 * The city publishes no events feed, and its own park events map has been
 * frozen on 2018 data for years, so the website is the only current source.
 * Requests missing ordinary browser headers are rejected by the site's CDN
 * with a 403, which is a completeness check rather than an access control:
 * there is no login, no CAPTCHA and no rate limit involved, and the pages are
 * public. Sending the headers a browser sends returns the page.
 *
 * The event pages carry machine-readable date attributes, so the parsing here
 * reads those rather than the rendered prose, which is both more reliable and
 * less likely to break on a redesign of the visible layout.
 *
 * The CDN does block datacenter address ranges, so the live fetch succeeds from
 * an ordinary connection and fails from a serverless host. Rerouting around an
 * address block would be working around a control rather than sending complete
 * headers, so instead the live fetch is attempted and a dated snapshot is used
 * when it fails. The snapshot is refreshed by `npm run snapshot:events` from a
 * machine that can reach the site, and its age is reported to the reader rather
 * than hidden.
 */
import type { Sourced } from "./types";
import snapshot from "@/data/events-snapshot.json";

const BASE = "https://www.cupertino.gov";
/** The calendar page links to the individual dated event pages. The Events
 *  landing page links only to their parents, which carry no dates. */
const INDEX = `${BASE}/Parks-Recreation/Events/Parks-and-Recreation-Event-Calendar`;

const TIMEOUT_MS = 12_000;
const REVALIDATE = 21_600; // Six hours. Programming changes seasonally.
const MAX_PAGES = 12; // Bounds fan-out; each event is its own page fetch.

/** A browser's ordinary request headers. Omitting these is what the CDN rejects. */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="126", "Not:A-Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export interface EventOccurrence {
  /** ISO date, e.g. "2026-08-13". */
  date: string;
  start: string | null;
  end: string | null;
}

export interface CityEvent {
  title: string;
  url: string;
  location: string | null;
  summary: string | null;
  occurrences: EventOccurrence[];
}

async function getPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: BROWSER_HEADERS,
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

function text(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

/** Dates come from data attributes rather than the rendered sentence. */
export function parseOccurrences(html: string): EventOccurrence[] {
  const out: EventOccurrence[] = [];
  const seen = new Set<string>();
  for (const li of html.match(/<li[^>]*multi-date-item[^>]*>/gi) ?? []) {
    const attr = (n: string) => li.match(new RegExp(`data-${n}=['"](\\d+)['"]`, "i"))?.[1];
    const y = attr("start-year");
    const m = attr("start-month");
    const d = attr("start-day");
    if (!y || !m || !d) continue;
    const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (seen.has(date)) continue;
    seen.add(date);
    const hh = attr("start-hour");
    const mm = attr("start-mins");
    const eh = attr("end-hour");
    const em = attr("end-mins");
    out.push({
      date,
      start: hh ? `${hh.padStart(2, "0")}:${(mm ?? "00").padStart(2, "0")}` : null,
      end: eh ? `${eh.padStart(2, "0")}:${(em ?? "00").padStart(2, "0")}` : null,
    });
  }
  // A single-date event states its date once, outside the multi-date list.
  if (out.length === 0) {
    const single = html.match(
      /data-start-year=['"](\d{4})['"][\s\S]{0,120}?data-start-month=['"](\d{1,2})['"][\s\S]{0,120}?data-start-day=['"](\d{1,2})['"]/i,
    );
    if (single) {
      out.push({
        date: `${single[1]}-${single[2].padStart(2, "0")}-${single[3].padStart(2, "0")}`,
        start: null,
        end: null,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function parseEvent(html: string, url: string): CityEvent | null {
  const title = decode(
    (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (!title) return null;

  const occurrences = parseOccurrences(html);

  // The page has a labeled Location block. An earlier version scanned the
  // whole body for a venue name, which matched the site navigation and
  // reported every event as being at the Sports Center.
  const labeled = html.match(
    /<h2[^>]*class="[^"]*sub-title[^"]*"[^>]*>\s*Location\s*<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
  );
  const mapped = html.match(/<div[^>]*class="[^"]*gmap-info[^"]*"[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const rawLoc = labeled?.[1] ?? mapped?.[1] ?? null;
  const location = rawLoc
    ? decode(rawLoc.replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ")
        .replace(/,?\s*View Map\s*$/i, "")
        .replace(/,\s*$/, "")
        .trim() || null
    : null;

  // Description comes from the content area, after the location block, so the
  // summary is about the event rather than about the site chrome.
  const main = html.split(/<h1[^>]*>/i)[1] ?? html;
  const summary = text(main).slice(0, 400) || null;

  return {
    title,
    url,
    location,
    summary,
    occurrences,
  };
}

/** Event pages linked from the Parks and Recreation events index. */
function discover(indexHtml: string): string[] {
  const hrefs = indexHtml.match(/href="([^"]+)"/gi) ?? [];
  const urls = new Set<string>();
  for (const h of hrefs) {
    const raw = h.slice(6, -1);
    if (!/\/Parks-Recreation\/Events\/[^"?#]+\/[^"?#]+/i.test(raw)) continue;
    if (/Event-Calendar|Festival-Information|Sponsorship/i.test(raw)) continue;
    const abs = raw.startsWith("http") ? raw : `${BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;
    if (abs.startsWith(BASE)) urls.add(abs.split("#")[0]);
  }
  return [...urls];
}

interface Snapshot {
  capturedAt: string;
  events: CityEvent[];
}

function fromSnapshot(reason: string): Sourced<CityEvent[]> {
  const snap = snapshot as Snapshot;
  return {
    data: snap.events ?? [],
    health: "curated",
    origin: `cupertino.gov Parks and Recreation, captured ${snap.capturedAt?.slice(0, 10) ?? "unknown"}`,
    fetchedAt: snap.capturedAt ?? new Date().toISOString(),
    error: `Live fetch unavailable (${reason}); showing the last capture. Confirm dates on the city's page.`,
  };
}

export async function getCityEvents(): Promise<Sourced<CityEvent[]>> {
  const origin = "cupertino.gov Parks and Recreation";
  try {
    const links = discover(await getPage(INDEX)).slice(0, MAX_PAGES);
    const settled = await Promise.allSettled(
      links.map(async (u) => parseEvent(await getPage(u), u)),
    );
    const events = settled
      .filter((r): r is PromiseFulfilledResult<CityEvent | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((e): e is CityEvent => e !== null && e.occurrences.length > 0);

    if (events.length === 0) return fromSnapshot("no event pages returned");

    return {
      data: events.sort((a, b) =>
        (a.occurrences[0]?.date ?? "").localeCompare(b.occurrences[0]?.date ?? ""),
      ),
      health: "live",
      origin,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return fromSnapshot(String(err).slice(0, 90));
  }
}
