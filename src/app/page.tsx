import Link from "next/link";
import { getNews } from "@/lib/news";
import type { Meeting } from "@/lib/types";
import {
  COUNCIL_BODY_ID,
  excludeCanceled,
  getPastMeetings,
  getUpcomingMeetings,
} from "@/lib/legistar";
import { CANDIDATES, ELECTION } from "@/data/election";
import { daysUntil, formatDate, formatWeekday, relativeDay } from "@/lib/format";
import { MeetingCard } from "@/components/MeetingCard";
import { Badge, Card, Container, EmptyState, SectionHeading, SourceNote } from "@/components/ui";
import { NewsList } from "@/components/NewsList";
import { EmblemStrip } from "@/components/Emblems";
import { Chat } from "@/components/Chat";

/** Home is a dashboard: the three things a resident most often needs, answered
 *  before any navigation. Rendered on the server so it is fast and indexable. */
export const revalidate = 900;

export default async function HomePage() {
  const [meetings, pastCouncil, news] = await Promise.all([
    getUpcomingMeetings(20),
    getPastMeetings(6, COUNCIL_BODY_ID),
    getNews(6),
  ]);

  const upcoming = meetings.data;
  const nextCouncil = excludeCanceled(upcoming).find((m) => m.bodyId === COUNCIL_BODY_ID);
  const lastCouncil = excludeCanceled(pastCouncil.data)[0];
  const others = upcoming.filter((m) => m.id !== nextCouncil?.id).slice(0, 4);
  const daysToElection = daysUntil(ELECTION.date);

  return (
    <>
      <section className="border-b border-border bg-surface-2">
        <Container className="py-12 sm:py-16">
          <div className="max-w-3xl">
            <EmblemStrip className="mb-6" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Cupertino, California
            </p>
            <h1 className="text-3xl font-bold leading-[1.12] tracking-tight text-ink sm:text-4xl">
              Ask anything about Cupertino.
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-ink-muted">
              Meetings, agendas, roll-call votes, commissions, the November election and local
              news, answered from the city&rsquo;s own records.
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <Chat compact />
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          <NextCouncilPanel meeting={nextCouncil} lastMeeting={lastCouncil} />
          <ElectionPanel days={daysToElection} />
        </div>

        <section className="mt-16">
          <SectionHeading
            title="Also coming up"
            description="Commissions and committees meeting soon."
            action={
              <Link href="/meetings" className="text-sm font-medium text-primary hover:underline">
                All meetings →
              </Link>
            }
          />
          {others.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {others.map((m) => (
                <MeetingCard key={m.id} meeting={m} showCountdown />
              ))}
            </ul>
          ) : (
            <EmptyState title="No other meetings scheduled right now.">
              The city has not yet published its next round of meeting dates. They appear here
              automatically as soon as it does.
            </EmptyState>
          )}
          <SourceNote source={meetings} className="mt-4" />
        </section>

        <section className="mt-16">
          <SectionHeading
            title="Latest local news"
            description="Headlines about Cupertino, linked to their original publishers."
            action={
              <Link href="/news" className="text-sm font-medium text-primary hover:underline">
                More news →
              </Link>
            }
          />
          <NewsList items={news.data} />
          <SourceNote source={news} className="mt-4" />
        </section>
      </Container>
    </>
  );
}

function NextCouncilPanel({
  meeting,
  lastMeeting,
}: {
  meeting: Meeting | undefined;
  lastMeeting: Meeting | undefined;
}) {
  // Council recesses (August especially) leave nothing scheduled. Rather than
  // showing an empty panel, point residents at the most recent meeting.
  const shown = meeting ?? lastMeeting;
  const isUpcoming = Boolean(meeting);

  return (
    <Card className="lg:col-span-2 border-l-4 border-l-primary">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {isUpcoming ? "Next City Council meeting" : "Most recent City Council meeting"}
      </p>
      {shown ? (
        <>
          <p className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {formatWeekday(shown.date)}, {formatDate(shown.date)}
          </p>
          <p className="mt-2 text-ink-muted">
            {shown.time ? `${shown.time} · ` : ""}
            {shown.location ?? "Community Hall, 10350 Torre Avenue"}
          </p>
          {shown.comment && (
            <p className="mt-2 text-sm text-ink-muted">
              {shown.comment}
              {/closed session/i.test(shown.comment) && (
                <span className="block mt-1">
                  Closed sessions are not open to the public, though the council reports out
                  afterward.
                </span>
              )}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone={isUpcoming ? "accent" : "neutral"}>{relativeDay(shown.date)}</Badge>
            <Link
              href={`/meetings/${shown.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {isUpcoming ? "Read the agenda" : "See what was decided"} →
            </Link>
          </div>
          {!isUpcoming && (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              No future council meeting is posted yet. The council typically meets the first and
              third Tuesday of each month and does not usually meet during its summer recess.
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-ink-muted">
          Council meeting data is unavailable right now. The council typically meets the first and
          third Tuesday of each month.
        </p>
      )}
    </Card>
  );
}

function ElectionPanel({ days }: { days: number }) {
  const past = days < 0;
  return (
    <Card className="flex flex-col justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          {ELECTION.label}
        </p>
        {past ? (
          <p className="mt-3 text-ink-muted">
            The {formatDate(ELECTION.date)} election has passed.
          </p>
        ) : (
          <>
            <p className="mt-3 text-4xl font-bold tracking-tight text-ink">{days}</p>
            <p className="text-ink-muted">
              {days === 1 ? "day" : "days"} until {formatDate(ELECTION.date)}
            </p>
          </>
        )}
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          {CANDIDATES.length} candidates are running for {ELECTION.seats} seats on the{" "}
          {ELECTION.office}.
        </p>
      </div>
      <Link href="/election" className="mt-5 text-sm font-medium text-primary hover:underline">
        Compare the candidates →
      </Link>
    </Card>
  );
}
