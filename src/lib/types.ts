/** Shared domain types. Kept source-agnostic so a feed can be swapped
 *  without touching the components that render it. */

export type SourceHealth = "live" | "curated" | "unavailable";

/** Anything rendered on the site declares where it came from, so the UI can
 *  be honest with residents about freshness. */
export interface Sourced<T> {
  data: T;
  health: SourceHealth;
  /** Human-readable origin, e.g. "Legistar" or "Curated by maintainers". */
  origin: string;
  fetchedAt: string;
  error?: string;
}

export interface Meeting {
  id: number;
  body: string;
  bodyId: number;
  /** ISO date (no time component from Legistar). */
  date: string;
  time: string | null;
  location: string | null;
  agendaUrl: string | null;
  minutesUrl: string | null;
  videoUrl: string | null;
  detailUrl: string;
  agendaStatus: string | null;
  minutesStatus: string | null;
  hasAgenda: boolean;
  hasMinutes: boolean;
}

export interface AgendaItem {
  id: number;
  order: number;
  title: string;
  /** Legistar file number, e.g. "25-14241". */
  matterFile: string | null;
  matterType: string | null;
  action: string | null;
  /** True for procedural rows like "ROLL CALL" that carry no decision. */
  procedural: boolean;
}

export interface GoverningBody {
  id: number;
  name: string;
  type: string;
  memberCount: number;
  slug: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
  topic: string;
  /** From a publisher's own Cupertino section, so it skips keyword vetting. */
  trusted?: boolean;
}

export interface Councilmember {
  name: string;
  role: "Mayor" | "Vice Mayor" | "Councilmember";
  termEnds?: string;
  email?: string;
  bioUrl?: string;
  note?: string;
}
