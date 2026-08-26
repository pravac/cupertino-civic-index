import Link from "next/link";
import type { Meeting } from "@/lib/types";
import { daysUntil, formatDate, formatWeekday, relativeDay } from "@/lib/format";
import { Badge, Card, ExternalIcon } from "./ui";

export function MeetingCard({ meeting, showCountdown = false }: { meeting: Meeting; showCountdown?: boolean }) {
  const days = daysUntil(meeting.date);
  const soon = showCountdown && days >= 0 && days <= 7;

  return (
    <Card as="li" className={`hover:border-border-strong ${soon ? "border-l-4 border-l-primary" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={meeting.bodyId === 138 ? "primary" : "neutral"}>{meeting.body}</Badge>
        {showCountdown && days >= 0 && days <= 7 && <Badge tone="accent">{relativeDay(meeting.date)}</Badge>}
        {meeting.hasMinutes && <Badge tone="success">Minutes</Badge>}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-snug text-ink">
        <Link href={`/meetings/${meeting.id}`} className="hover:underline">
          {formatWeekday(meeting.date)}, {formatDate(meeting.date)}
        </Link>
      </h3>

      <dl className="mt-2 space-y-1 text-sm text-ink-muted">
        {meeting.time && (
          <div className="flex gap-2">
            <dt className="sr-only">Time</dt>
            <dd>{meeting.time}</dd>
          </div>
        )}
        {meeting.location && (
          <div className="flex gap-2">
            <dt className="sr-only">Location</dt>
            <dd className="leading-relaxed">{meeting.location}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href={`/meetings/${meeting.id}`} className="font-medium text-primary hover:underline">
          What&rsquo;s on the agenda
        </Link>
        <a
          href={meeting.detailUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-ink-muted hover:text-ink hover:underline"
        >
          Official record
          <ExternalIcon />
        </a>
      </div>
    </Card>
  );
}
