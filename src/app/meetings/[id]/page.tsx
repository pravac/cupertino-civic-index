import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgendaItems, getMeeting } from "@/lib/legistar";
import { daysUntil, formatDate, formatWeekday, relativeDay } from "@/lib/format";
import { Badge, ButtonLink, Card, Container, EmptyState, PageHeader, SourceNote } from "@/components/ui";

export const revalidate = 900;

// Next 16: route params arrive as a Promise and must be awaited.
type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const { data: meeting } = await getMeeting(Number(id));
  if (!meeting) return { title: "Meeting not found" };
  return {
    title: `${meeting.body}: ${formatDate(meeting.date)}`,
    description: `Agenda for the ${meeting.body} meeting on ${formatDate(meeting.date)} in Cupertino, California.`,
  };
}

export default async function MeetingPage({ params }: Params) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const [meetingResult, itemsResult] = await Promise.all([
    getMeeting(numericId),
    getAgendaItems(numericId),
  ]);

  const meeting = meetingResult.data;
  if (!meeting) notFound();

  const substantive = itemsResult.data.filter((i) => !i.procedural);
  const procedural = itemsResult.data.filter((i) => i.procedural);

  // A past meeting with no agenda means something different from a future one,
  // and a canceled meeting explains itself. Saying "not published yet" about a
  // meeting that already happened is simply wrong.
  const isPast = daysUntil(meeting.date) < 0;
  const agendaAbsenceReason = meeting.canceled
    ? "The meeting was canceled, so no agenda was carried out."
    : isPast
      ? "No agenda was recorded for this meeting in the city's records system. The official record may still have the packet."
      : "Agenda items appear here once the city publishes the agenda.";

  return (
    <>
      <PageHeader
        eyebrow={meeting.body}
        title={`${formatWeekday(meeting.date)}, ${formatDate(meeting.date)}`}
        intro={
          [meeting.time, meeting.location].filter(Boolean).join(" · ") || undefined
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {meeting.canceled && <Badge tone="warning">Canceled</Badge>}
          <Badge tone="primary">{relativeDay(meeting.date)}</Badge>
          {meeting.agendaStatus && <Badge>Agenda: {meeting.agendaStatus}</Badge>}
          {meeting.minutesStatus && <Badge>Minutes: {meeting.minutesStatus}</Badge>}
        </div>
      </PageHeader>

      <Container className="py-12">
        {meeting.canceled && (
          <div className="mb-8 rounded-xl border border-warning bg-warning-soft p-5">
            <p className="font-semibold text-warning">This meeting was canceled.</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">
              The city canceled this meeting, so no business was conducted and no minutes will
              follow. Any items that were scheduled are typically carried to a later meeting.
            </p>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-3">
          <ButtonLink href={meeting.detailUrl} external>
            Official meeting record
          </ButtonLink>
          {meeting.agendaUrl && (
            <ButtonLink href={meeting.agendaUrl} variant="secondary" external>
              Agenda packet (PDF)
            </ButtonLink>
          )}
          {meeting.minutesUrl && (
            <ButtonLink href={meeting.minutesUrl} variant="secondary" external>
              Minutes
            </ButtonLink>
          )}
          {meeting.videoUrl && (
            <ButtonLink href={meeting.videoUrl} variant="secondary" external>
              Video
            </ButtonLink>
          )}
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {meeting.canceled ? "Agenda as published" : "On the agenda"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {substantive.length > 0
            ? `${substantive.length} substantive ${substantive.length === 1 ? "item" : "items"}. Routine procedural items are listed separately below.`
            : agendaAbsenceReason}
        </p>

        {substantive.length > 0 ? (
          <ol className="mt-6 space-y-3">
            {substantive.map((item, i) => (
              <Card as="li" key={item.id} className="flex gap-4">
                <span
                  className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-ink-muted"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="leading-relaxed text-ink">{item.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.matterFile && <Badge>File {item.matterFile}</Badge>}
                    {item.matterType && <Badge tone="neutral">{item.matterType}</Badge>}
                    {item.action && <Badge tone="success">{item.action}</Badge>}
                  </div>
                </div>
              </Card>
            ))}
          </ol>
        ) : (
          <div className="mt-6">
            <EmptyState
              title={meeting.canceled ? "No agenda was carried out." : isPast ? "No agenda on record." : "No agenda published yet."}
            >
              {agendaAbsenceReason}
            </EmptyState>
          </div>
        )}

        {procedural.length > 0 && (
          <details className="mt-8 rounded-xl border border-border bg-surface-2 p-5">
            <summary className="cursor-pointer text-sm font-medium text-ink">
              Show {procedural.length} procedural {procedural.length === 1 ? "item" : "items"}
            </summary>
            <ul className="mt-4 space-y-2 text-sm text-ink-muted">
              {procedural.map((item) => (
                <li key={item.id} className="leading-relaxed">
                  {item.title.length > 200 ? `${item.title.slice(0, 200)}…` : item.title}
                </li>
              ))}
            </ul>
          </details>
        )}

        <SourceNote source={itemsResult} className="mt-8" />

        <p className="mt-8">
          <Link href="/meetings" className="text-sm font-medium text-primary hover:underline">
            ← All meetings
          </Link>
        </p>
      </Container>
    </>
  );
}
