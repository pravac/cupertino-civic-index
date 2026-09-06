/**
 * The long-term archive: council-relevant Cupertino coverage back to 2016,
 * captured by `npm run snapshot:news` into src/data/news-archive.json.
 *
 * A snapshot rather than a live feed for the same reason the votes are read
 * out of minutes PDFs: the thing residents come back asking about is rarely
 * in the last sixty days, and the live index quietly forgets. The capture
 * accumulates across runs, so this file only ever gets more complete.
 */
import raw from "@/data/news-archive.json";
import type { NewsItem } from "./types";

interface Archive {
  capturedAt: string;
  from: string;
  items: NewsItem[];
}

const archive = raw as Archive;

export const ARCHIVE: NewsItem[] = archive.items;
export const ARCHIVE_CAPTURED_AT = archive.capturedAt;
export const ARCHIVE_FROM = archive.from;

/** Newest year first, items within a year newest first (the snapshot is
 *  already sorted). Undated items are dropped rather than guessed at. */
export function archiveByYear(): [string, NewsItem[]][] {
  const years = new Map<string, NewsItem[]>();
  for (const item of ARCHIVE) {
    const year = item.publishedAt?.slice(0, 4);
    if (!year) continue;
    (years.get(year) ?? years.set(year, []).get(year)!).push(item);
  }
  return [...years.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/**
 * Keyword search over archived headlines, for the assistant. Every word of
 * the query longer than two letters must appear in the title: OR-matching a
 * multi-word question returns everything and helps nobody. Ranked newest
 * first, because "what happened with X" usually means the latest chapter.
 */
export function searchArchive(query: string, limit = 10): NewsItem[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];
  return ARCHIVE.filter((i) => {
    const t = i.title.toLowerCase();
    return terms.every((term) => t.includes(term));
  }).slice(0, limit);
}
