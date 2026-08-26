const TZ = "America/Los_Angeles";

/** Legistar returns dates as local midnight with no zone marker. Treat the
 *  date portion as a plain calendar date so it never shifts a day. */
export function parseCalendarDate(raw: string): Date {
  const datePart = raw.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(
  raw: string,
  opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" },
): string {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(
    parseCalendarDate(raw),
  );
}

export function formatShortDate(raw: string): string {
  return formatDate(raw, { month: "short", day: "numeric", year: "numeric" });
}

export function formatWeekday(raw: string): string {
  return formatDate(raw, { weekday: "long" });
}

/** Whole days from today to the given calendar date; negative if past. */
export function daysUntil(raw: string): number {
  const target = parseCalendarDate(raw).getTime();
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
  const today = parseCalendarDate(todayStr).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function relativeDay(raw: string): string {
  const d = daysUntil(raw);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d > 1 && d < 7) return `In ${d} days`;
  if (d === -1) return "Yesterday";
  if (d < -1 && d > -7) return `${Math.abs(d)} days ago`;
  return formatShortDate(raw);
}

/** Today in Pacific time as YYYY-MM-DD — the city's own clock. */
export function todayInCupertino(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function formatRelativeTimestamp(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
