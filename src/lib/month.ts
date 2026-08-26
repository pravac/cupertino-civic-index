/** Month-grid helpers. All dates are treated as plain calendar dates in UTC so
 *  nothing shifts a day across the Pacific timezone boundary. */
import { parseCalendarDate, todayInCupertino } from "./format";

export interface MonthInfo {
  /** "2026-08" */
  key: string;
  year: number;
  /** 1-indexed. */
  month: number;
  label: string;
  firstDayIso: string;
  nextMonthIso: string;
  prevKey: string;
  nextKey: string;
}

const KEY_RE = /^(\d{4})-(\d{2})$/;

export function currentMonthKey(): string {
  return todayInCupertino().slice(0, 7);
}

export function parseMonthKey(raw: string | undefined): MonthInfo {
  const fallback = currentMonthKey();
  const m = raw && KEY_RE.test(raw) ? raw : fallback;
  const [y, mo] = m.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  const prev = mo === 1 ? { y: y - 1, m: 12 } : { y, m: mo - 1 };
  const next = mo === 12 ? { y: y + 1, m: 1 } : { y, m: mo + 1 };

  return {
    key: `${y}-${pad(mo)}`,
    year: y,
    month: mo,
    label: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, mo - 1, 1))),
    firstDayIso: `${y}-${pad(mo)}-01`,
    nextMonthIso: `${next.y}-${pad(next.m)}-01`,
    prevKey: `${prev.y}-${pad(prev.m)}`,
    nextKey: `${next.y}-${pad(next.m)}`,
  };
}

export interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

/** Six weeks of cells, Sunday first, so the grid height never jumps. */
export function buildMonthGrid(info: MonthInfo): DayCell[] {
  const first = new Date(Date.UTC(info.year, info.month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - first.getUTCDay());
  const today = todayInCupertino();

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({
      iso,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === info.month - 1,
      isToday: iso === today,
    });
  }
  return cells;
}

export function isPastDay(iso: string): boolean {
  return parseCalendarDate(iso).getTime() < parseCalendarDate(todayInCupertino()).getTime();
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
