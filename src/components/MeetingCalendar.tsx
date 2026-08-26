import Link from "next/link";
import type { Meeting } from "@/lib/types";
import { WEEKDAYS, buildMonthGrid, isPastDay, type MonthInfo } from "@/lib/month";
import { formatDate } from "@/lib/format";

/** Short label for a chip, since cells are narrow. */
function shortBody(name: string): string {
  return name
    .replace(/\s*Commission$/i, "")
    .replace(/\s*Committee$/i, "")
    .replace(/^City\s+/i, "");
}

function chipClasses(meeting: Meeting, past: boolean): string {
  if (meeting.canceled) {
    return "bg-warning-soft text-warning line-through decoration-1";
  }
  if (meeting.bodyId === 138) {
    return past
      ? "bg-primary-soft/60 text-primary"
      : "bg-primary text-primary-fg font-medium";
  }
  return past ? "bg-surface-2 text-ink-muted" : "bg-surface-2 text-ink";
}

export function MeetingCalendar({
  info,
  meetings,
}: {
  info: MonthInfo;
  meetings: Meeting[];
}) {
  const byDay = new Map<string, Meeting[]>();
  for (const m of meetings) {
    const day = m.date.split("T")[0];
    byDay.set(day, [...(byDay.get(day) ?? []), m]);
  }
  const cells = buildMonthGrid(info);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/meetings?month=${info.prevKey}`}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
          aria-label={`Previous month, ${info.prevKey}`}
        >
          ← Prev
        </Link>
        <h3 className="text-lg font-semibold tracking-tight text-ink">{info.label}</h3>
        <Link
          href={`/meetings?month=${info.nextKey}`}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
          aria-label={`Next month, ${info.nextKey}`}
        >
          Next →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] table-fixed border-collapse">
          <caption className="sr-only">
            Cupertino public meetings for {info.label}. Canceled meetings are marked.
          </caption>
          <thead>
            <tr>
              {WEEKDAYS.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className="border border-border bg-surface-2 p-2 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, week) => (
              <tr key={week}>
                {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                  const dayMeetings = byDay.get(cell.iso) ?? [];
                  const past = isPastDay(cell.iso);
                  return (
                    <td
                      key={cell.iso}
                      className={`h-28 border border-border align-top p-1.5 ${
                        cell.inMonth ? "bg-surface" : "bg-surface-2/40"
                      } ${cell.isToday ? "outline outline-2 -outline-offset-2 outline-primary" : ""}`}
                    >
                      <div
                        className={`mb-1 text-xs tabular-nums ${
                          cell.inMonth ? "text-ink-muted" : "text-ink-muted/50"
                        } ${cell.isToday ? "font-bold text-primary" : ""}`}
                      >
                        {cell.day}
                      </div>
                      <ul className="space-y-1">
                        {dayMeetings.map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/meetings/${m.id}`}
                              title={
                                m.canceled
                                  ? `${m.body} on ${formatDate(m.date)} was canceled.`
                                  : `${m.body} on ${formatDate(m.date)}.${
                                      past ? " See what was decided." : " See the agenda."
                                    }`
                              }
                              className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-80 ${chipClasses(
                                m,
                                past,
                              )}`}
                            >
                              {shortBody(m.body)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-primary" aria-hidden />
          City Council
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-surface-2 border border-border" aria-hidden />
          Commission or committee
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-warning-soft" aria-hidden />
          Canceled
        </li>
        <li>Past meetings link to what was decided.</li>
      </ul>
    </div>
  );
}
