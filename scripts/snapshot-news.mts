/**
 * Builds the long-term news archive: council-relevant coverage of Cupertino
 * going back to 2016, captured to a JSON snapshot the news page renders.
 *
 * Why a snapshot and not a bigger live query: Google News caps any single
 * feed at about a hundred items and biases them to the recent past, so a
 * "last five years" query returns a thin scattering and silently drops the
 * rest. Dated windows (after:/before:) still work, though, so this walks the
 * calendar in half-year steps with several queries per window and accumulates
 * everything relevant. Slow, cheap, and run by hand, which is the right shape
 * for an archive: history does not change between runs, it only grows at the
 * near end.
 *
 * The archive ACCUMULATES. Google's index forgets: an article findable in
 * March can be gone from the feed by June, which is exactly why the archive
 * exists. So a re-run merges into the existing file and never removes
 * anything a previous run captured. Wiping it means deleting the file first,
 * deliberately.
 *
 * The window starts in 2016 rather than five years back: the Vallco Measure
 * C and D campaign that fall is where the city's current fault lines formed,
 * and an archive of council history that starts after it would be missing its
 * first chapter.
 *
 *   npm run snapshot:news
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { archiveRelevant, dedupe, parseRss } from "../src/lib/news";
import type { NewsItem } from "../src/lib/types";

const OUT = "src/data/news-archive.json";
const FROM_YEAR = 2016;
/** Half-year windows: small enough that a busy news cycle stays under the
 *  feed's item cap, large enough that the run finishes in minutes. */
const WINDOW_MONTHS = 6;
/** Be a polite client of an unauthenticated feed. */
const DELAY_MS = 1_200;

/**
 * Several narrow queries beat one broad one: each window's feed caps out
 * around a hundred items, so a single kitchen-sink query lets a noisy summer
 * of school coverage crowd out the council race underneath it.
 */
const QUERIES = [
  // The council itself.
  '"Cupertino" (council OR councilmember OR mayor OR "city hall" OR "planning commission" OR "city manager" OR ordinance)',
  // Elections, measures and campaigns.
  '"Cupertino" (election OR ballot OR measure OR campaign OR candidate OR recall OR voters)',
  // The development fights that drive most of the above.
  'Cupertino (Vallco OR "housing element" OR "The Rise" OR rezoning OR "general plan")',
  // Accountability: the stories people come back looking for years later.
  '"Cupertino" ("district attorney" OR investigation OR "grand jury" OR censure OR "Brown Act" OR audit OR resign)',
];

/**
 * Articles a person confirmed by hand, for coverage that exists but that the
 * feed's index no longer returns. Old newspaper archives fall out of search
 * indexes, and "the index forgot it" is not a reason for the archive to.
 *
 * Every entry needs a real, checked URL. The standard is the same as
 * candidate sources: never add one from memory or from a search result that
 * merely looks right, because a wrong link under a real headline is worse
 * than the gap it fills.
 */
const PINNED: (NewsItem & { confirmedOn: string })[] = [
  {
    // Checked against the live page: og:title matches, published 2016-11-03,
    // and the text carries the sign theft, assault and misappropriation
    // allegations from the Measure C/D campaign's final days. Google's index
    // no longer returns it under any query tried.
    title: "Cupertino's Vallco measures: Contentious last days of campaign",
    url: "https://www.mercurynews.com/2016/11/03/sign-of-the-times-tension-division-in-cupertino-over-vallco-measures/",
    source: "The Mercury News",
    publishedAt: "2016-11-03T18:26:07.000Z",
    topic: "archive",
    confirmedOn: "2026-09-06",
  },
  {
    // Already captured by query, but through a Google redirect link. Pinned
    // with the canonical URL, which wins deduplication and replaces it.
    title: "District attorney drops investigation into Cupertino council",
    url: "https://sanjosespotlight.com/district-attorney-drops-investigation-into-cupertino-council/",
    source: "San José Spotlight",
    publishedAt: "2023-05-27T00:00:00.000Z",
    topic: "archive",
    confirmedOn: "2026-09-06",
  },
];

interface Archive {
  capturedAt: string;
  from: string;
  items: NewsItem[];
}

function feedUrl(query: string, after: string, before: string): string {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(`${query} after:${after} before:${before}`) +
    "&hl=en-US&gl=US&ceid=US:en"
  );
}

async function fetchWindow(query: string, after: string, before: string): Promise<NewsItem[]> {
  const res = await fetch(feedUrl(query, after, before), {
    headers: { "User-Agent": "CupertinoCivicIndex/1.0 (+civic resource aggregator)" },
  });
  if (!res.ok) {
    console.error(`  feed responded ${res.status} for ${after}..${before}`);
    return [];
  }
  return parseRss(await res.text(), "archive");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Half-year boundaries from FROM_YEAR through today. */
function windows(): [string, string][] {
  const out: [string, string][] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (let y = FROM_YEAR; y <= new Date().getFullYear(); y++) {
    for (let m = 0; m < 12; m += WINDOW_MONTHS) {
      const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
      const endMonth = m + WINDOW_MONTHS;
      const end = endMonth >= 12 ? `${y + 1}-01-01` : `${y}-${String(endMonth + 1).padStart(2, "0")}-01`;
      if (start > today) return out;
      out.push([start, end > today ? today : end]);
    }
  }
  return out;
}

const existing: Archive | null = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, "utf8")) as Archive)
  : null;

const collected: NewsItem[] = [];
const spans = windows();
console.log(`${spans.length} windows x ${QUERIES.length} queries from ${FROM_YEAR}...`);

for (const [after, before] of spans) {
  let found = 0;
  for (const q of QUERIES) {
    const items = await fetchWindow(q, after, before);
    found += items.length;
    collected.push(...items);
    await sleep(DELAY_MS);
  }
  console.log(`${after}..${before}: ${found} headlines`);
}

// Pinned entries first so they win deduplication, and exempt from the
// relevance filter: a person confirmed each one, and the filter exists to
// stand in for a person, not to overrule one. Previous captures beat fresh
// ones for the same reason older sightings have links already in circulation.
const merged = dedupe([
  ...PINNED.map((entry): NewsItem => ({
    title: entry.title,
    url: entry.url,
    source: entry.source,
    publishedAt: entry.publishedAt,
    topic: entry.topic,
  })),
  ...[...(existing?.items ?? []), ...collected].filter((i) => archiveRelevant(i.title)),
]);

merged.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

const out: Archive = {
  capturedAt: new Date().toISOString(),
  from: `${FROM_YEAR}-01-01`,
  items: merged,
};
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const byYear = new Map<string, number>();
for (const i of merged) {
  const y = i.publishedAt?.slice(0, 4) ?? "undated";
  byYear.set(y, (byYear.get(y) ?? 0) + 1);
}
console.log(`\n${merged.length} headlines in the archive (${existing ? `was ${existing.items.length}` : "new file"}):`);
for (const [y, n] of [...byYear].sort()) console.log(`  ${y}: ${n}`);
