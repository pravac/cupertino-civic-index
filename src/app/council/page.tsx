import type { Metadata } from "next";
import Link from "next/link";
import { COUNCIL_BODY_ID, getPastMeetings, getUpcomingMeetings } from "@/lib/legistar";
import { COUNCIL, COUNCIL_FACTS, COUNCIL_LAST_VERIFIED, COUNCIL_SOURCE_URL } from "@/data/council";
import { formatDate } from "@/lib/format";
import { MeetingCard } from "@/components/MeetingCard";
import { Badge, ButtonLink, Card, Container, EmptyState, PageHeader, SectionHeading, SourceNote } from "@/components/ui";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "City Council",
  description:
    "Who serves on the Cupertino City Council, how the council works, and when it meets.",
};

export default async function CouncilPage() {
  const [upcoming, past] = await Promise.all([
    getUpcomingMeetings(30),
    getPastMeetings(6, COUNCIL_BODY_ID),
  ]);
  const councilUpcoming = upcoming.data.filter((m) => m.bodyId === COUNCIL_BODY_ID);

  return (
    <>
      <PageHeader
        eyebrow="Your government"
        title="Cupertino City Council"
        intro="Five members, elected at large to overlapping four-year terms. They set city policy, adopt the budget, and make the final call on land use."
      />
      <Container className="py-12">
        <section>
          <SectionHeading title="Current members" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COUNCIL.map((m) => (
              <Card as="li" key={m.name}>
                <p className="text-lg font-semibold tracking-tight text-ink">{m.name}</p>
                <div className="mt-2">
                  <Badge tone={m.role === "Councilmember" ? "neutral" : "primary"}>{m.role}</Badge>
                </div>
                {m.termEnds && (
                  <p className="mt-3 text-sm text-ink-muted">Term ends {m.termEnds}</p>
                )}
              </Card>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-muted">
            Roster maintained by hand and last verified {formatDate(COUNCIL_LAST_VERIFIED)}. Confirm
            against the{" "}
            <a
              className="underline hover:text-ink"
              href={COUNCIL_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
            >
              city&rsquo;s official council page
            </a>
            .
          </p>
        </section>

        <section className="mt-16">
          <SectionHeading
            title="How the council works"
            description="The details residents most often get wrong."
          />
          <dl className="grid gap-4 sm:grid-cols-2">
            {COUNCIL_FACTS.map((f) => (
              <Card key={f.label}>
                <dt className="text-sm font-semibold text-ink">{f.label}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.value}</dd>
              </Card>
            ))}
          </dl>
          <div className="mt-6">
            <ButtonLink href="/participate" variant="secondary">
              How to speak at a meeting
            </ButtonLink>
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading
            title="Upcoming council meetings"
            action={
              <Link href="/meetings" className="text-sm font-medium text-primary hover:underline">
                All bodies →
              </Link>
            }
          />
          {councilUpcoming.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {councilUpcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} showCountdown />
              ))}
            </ul>
          ) : (
            <EmptyState title="No council meetings currently scheduled.">
              The council typically meets the first and third Tuesday of each month.
            </EmptyState>
          )}
          <SourceNote source={upcoming} className="mt-4" />
        </section>

        <section className="mt-16">
          <SectionHeading title="Recent council meetings" />
          {past.data.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {past.data.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </ul>
          ) : (
            <EmptyState title="No recent meetings found." />
          )}
        </section>
      </Container>
    </>
  );
}
