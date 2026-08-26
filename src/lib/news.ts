/**
 * News aggregation via Google News RSS.
 *
 * Deliberately headline-only: we store and render a title, publisher, date and
 * link straight to the publisher. No article text is copied or cached, which
 * keeps this a referral index rather than a republisher, which is the right posture for
 * something a city might adopt.
 */
import type { NewsItem, Sourced } from "./types";

const TIMEOUT_MS = 8_000;
const REVALIDATE = 1_800;

export interface NewsTopic {
  key: string;
  label: string;
  query: string;
  description: string;
  /** Accept regional landmarks (freeways, transit) as well as Cupertino
   *  itself. A Highway 17 repaving affects Cupertino commuters even though
   *  the headline never mentions the city. */
  allowRegional?: boolean;
}

/** Each topic is one RSS query. Add a topic here and it appears in the UI. */
export const NEWS_TOPICS: NewsTopic[] = [
  {
    key: "city-hall",
    label: "City Hall",
    query: '"Cupertino" (council OR "city hall" OR mayor OR ordinance)',
    description: "Council decisions, budgets, and city government",
  },
  {
    key: "housing",
    label: "Housing & Development",
    query: '"Cupertino" (housing OR development OR Vallco OR "housing element")',
    description: "Development projects and state housing mandates",
  },
  {
    key: "schools",
    label: "Schools",
    query: '"Cupertino" (school OR "school district" OR students)',
    description: "CUSD, FUHSD, and De Anza College",
  },
  {
    key: "getting-around",
    label: "Getting Around",
    query:
      '("Highway 17" OR "Highway 85" OR "Stevens Creek Boulevard" OR "De Anza Boulevard" OR "Interstate 280" OR "Lawrence Expressway" OR "Wolfe Road") (Cupertino OR "Santa Clara" OR "San Jose" OR Campbell OR "Los Gatos" OR Saratoga OR Sunnyvale OR "Santa Cruz Mountains")',
    description: "Roads, freeways, transit and construction affecting local commutes",
    allowRegional: true,
  },
  {
    key: "mercury",
    label: "From The Mercury News",
    query:
      'site:mercurynews.com (Cupertino OR "Highway 17" OR "Highway 85" OR "Stevens Creek" OR "De Anza")',
    description: "Regional coverage from the Bay Area's largest local newsroom",
    allowRegional: true,
  },
  {
    key: "community",
    label: "Community",
    query: '"Cupertino" (residents OR community OR park OR library OR festival)',
    description: "Neighborhoods, parks, events, and local life",
  },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

/** Google News titles arrive as "Headline - Publisher"; split the tail off. */
function splitTitle(raw: string, source: string | null): string {
  if (source && raw.endsWith(` - ${source}`)) {
    return raw.slice(0, -(source.length + 3)).trim();
  }
  const idx = raw.lastIndexOf(" - ");
  return idx > 20 ? raw.slice(0, idx).trim() : raw;
}

interface ParseOpts {
  /** Publisher feeds carry no <source> tag, so name them explicitly. */
  defaultSource?: string;
  /** Google appends " - Publisher" to titles; publisher feeds do not. */
  splitTitles?: boolean;
}

function parseRss(xml: string, topic: string, opts: ParseOpts = {}): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const block of blocks) {
    const rawTitle = tag(block, "title");
    const link = tag(block, "link");
    if (!rawTitle || !link) continue;
    const source = tag(block, "source") ?? opts.defaultSource ?? "Unknown";
    const pub = tag(block, "pubDate");
    items.push({
      title: opts.splitTitles === false ? rawTitle : splitTitle(rawTitle, source),
      url: link,
      source,
      publishedAt: pub ? new Date(pub).toISOString() : null,
      topic,
    });
  }
  return items;
}

/**
 * Feeds published directly by local outlets. These beat the Google News search
 * on every axis. The publisher has already decided the story is about
 * Cupertino, the links are canonical rather than redirects, and attribution is
 * exact, so they are fetched first and win deduplication.
 *
 * The city's own newsroom at cupertino.gov is deliberately absent: it sits
 * behind bot protection that returns 403 to any automated request. Working
 * around that would mean evading an access control, which is the wrong posture
 * for a tool meant to be handed to the city. The right fix is to ask the city
 * for a feed, not to take one.
 */
interface DirectFeed {
  name: string;
  url: string;
  topic: string;
}

export const DIRECT_FEEDS: DirectFeed[] = [
  {
    name: "San José Spotlight",
    // Canonical path. /category/cupertino/feed still 301s here.
    url: "https://sanjosespotlight.com/news/cupertino/feed/",
    topic: "city-hall",
  },
];

async function fetchDirect(feed: DirectFeed): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "CupertinoCivicIndex/1.0 (+civic resource aggregator)" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`${feed.name} responded ${res.status}`);
    return parseRss(await res.text(), feed.topic, {
      defaultSource: feed.name,
      splitTitles: false,
    }).map((i) => ({ ...i, trusted: true }));
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTopic(t: NewsTopic): Promise<NewsItem[]> {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(`${t.query} when:60d`) +
    "&hl=en-US&gl=US&ceid=US:en";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "CupertinoCivicIndex/1.0 (+civic resource aggregator)" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`News feed responded ${res.status}`);
    return parseRss(await res.text(), t.key);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cupertino is Apple's mailing address, so a naive "Cupertino" search returns
 * mostly AAPL stock moves and iPhone rumors. Precision matters more than volume
 * for a civic index, so a story must name Cupertino (or a local institution)
 * and must not be corporate Apple coverage.
 */
const LOCAL = /\bcupertino\b|\bde anza\b|\bvallco\b|\bfuhsd\b|\bcusd\b|\bmonta vista\b/i;

/**
 * Route numbers are not unique across the country: Highway 17 also runs through
 * the Carolinas and Highway 85 through Colorado, so a road name alone pulls in
 * crashes two thousand miles away. Regional stories must also name somewhere in
 * this corner of the Bay Area.
 */
const BAY_AREA =
  /\b(cupertino|santa clara|san jos[eé]|campbell|los gatos|saratoga|sunnyvale|mountain view|palo alto|milpitas|los altos|santa cruz mountains|bay area|silicon valley|south bay|peninsula)\b/i;

/** Landmarks outside city limits that still shape daily life in Cupertino. */
const REGIONAL =
  /\b(highway 17|highway 85|hwy 17|hwy 85|i-280|interstate 280|stevens creek|de anza|wolfe road|homestead road|foothill expressway|lawrence expressway|caltrans|\bvta\b|caltrain|santa clara county)\b/i;

const APPLE_CORPORATE =
  /\b(aapl|iphone|ipad|macbook|imac|apple watch|airpods|vision pro|ios \d|app store|tim cook|earnings|shares?|stock|nasdaq|chip|silicon|wwdc|siri|trade secrets?|lawsuit|openai|execs?|ceo)\b/i;

/** "Cupertino-based X" describes a company headquartered here, so the story is
 *  about the company, not the city. Same for obituaries and entertainment. */
const NOT_CIVIC =
  /cupertino[- ]based|\bobituary\b|\btrailer\b|\bteaser\b|\bseason \d|\bfilming\b|\blegal drama\b/i;

/** High-school box scores and schedules dominate any local news query. */
const SPORTS =
  /\b(volleyball|football|basketball|soccer|baseball|softball|lacrosse|water polo|wrestling|track and field|matadors|pioneers|schedule -|box score|athletics)\b/i;

/** Civic words strong enough to keep a story even if Apple is mentioned.
 *  Apple's campus going before the Planning Commission is real city news. */
const CIVIC =
  /\b(council|councilmember|city hall|mayor|ordinance|zoning|planning commission|housing element|ballot|election|voters?|budget|residents?|school board|library|permit|general plan)\b/i;

const REGIONAL_TOPICS = new Set(
  NEWS_TOPICS.filter((t) => t.allowRegional).map((t) => t.key),
);

function isRelevant(item: NewsItem): boolean {
  const t = item.title;
  // A publisher's own Cupertino section has already made the local call.
  const localEnough =
    LOCAL.test(t) ||
    (REGIONAL_TOPICS.has(item.topic) && REGIONAL.test(t) && BAY_AREA.test(t));
  if (!item.trusted && !localEnough) return false;
  if (NOT_CIVIC.test(t) || SPORTS.test(t)) return false;
  if (APPLE_CORPORATE.test(t) && !CIVIC.test(t)) return false;
  return true;
}

/** Same story often appears under several topics; keep the first sighting. */
function dedupe(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getNews(limit = 40): Promise<Sourced<NewsItem[]>> {
  const [directResults, topicResults] = await Promise.all([
    Promise.allSettled(DIRECT_FEEDS.map(fetchDirect)),
    Promise.allSettled(NEWS_TOPICS.map(fetchTopic)),
  ]);
  const results = [...directResults, ...topicResults];
  const ok = results.filter((r) => r.status === "fulfilled");
  // Direct feeds lead so deduplication keeps the canonical publisher link.
  const all = ok.flatMap((r) => (r as PromiseFulfilledResult<NewsItem[]>).value);

  if (ok.length === 0) {
    return {
      data: [],
      health: "unavailable",
      origin: "Google News",
      fetchedAt: new Date().toISOString(),
      error: "News feeds could not be reached.",
    };
  }

  const sorted = dedupe(all.filter(isRelevant)).sort((a, b) => {
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return b.publishedAt.localeCompare(a.publishedAt);
  });

  return {
    data: sorted.slice(0, limit),
    // A partial failure still renders, but say so rather than implying full coverage.
    health: ok.length === results.length ? "live" : "curated",
    origin: "Google News",
    fetchedAt: new Date().toISOString(),
    error:
      ok.length === results.length
        ? undefined
        : `${results.length - ok.length} of ${results.length} sources unavailable.`,
  };
}
