import type { Metadata } from "next";
import { CANDIDATES, ELECTION, ELECTION_CONTEXT } from "@/data/election";
import { daysUntil, formatDate } from "@/lib/format";
import { Badge, ButtonLink, Card, Container, PageHeader, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "November 2026 Election",
  description:
    "Who is running for Cupertino City Council on November 3, 2026, what they say they will do, and how to vote.",
};

export default function ElectionPage() {
  const days = daysUntil(ELECTION.date);
  const slates = Array.from(
    new Set(CANDIDATES.map((c) => c.slate).filter((s): s is string => Boolean(s))),
  );

  return (
    <>
      <PageHeader
        eyebrow={ELECTION.label}
        title={`${ELECTION.seats} council seats on the ballot`}
        intro={`${CANDIDATES.length} candidates are running for ${ELECTION.seats} of the five seats on the ${ELECTION.office}, on ${formatDate(ELECTION.date)}.`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {days >= 0 && <Badge tone="accent">{days} days out</Badge>}
          <ButtonLink href={ELECTION.registrarUrl} external>
            Register or check your registration
          </ButtonLink>
        </div>
      </PageHeader>

      <Container className="py-12">
        <Card className="border-l-4 border-l-accent">
          <p className="text-sm font-semibold text-ink">What this election is about</p>
          <p className="mt-2 leading-relaxed text-ink-muted">{ELECTION_CONTEXT}</p>
          <p className="mt-3 text-sm text-ink-muted">
            Two informal slates have formed: {slates.join(" and ")}. Slate membership is
            self-declared and does not appear on the ballot.
          </p>
        </Card>

        <section className="mt-14">
          <SectionHeading
            title="The candidates"
            description="Listed alphabetically. Priorities are summarized from each candidate's own stated platform."
          />
          <ul className="grid gap-4 lg:grid-cols-2">
            {CANDIDATES.map((c) => (
              <Card as="li" key={c.name} className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-lg font-semibold tracking-tight text-ink">{c.name}</p>
                  {c.incumbent && <Badge tone="primary">Incumbent</Badge>}
                </div>
                <p className="mt-1.5 text-sm text-ink-muted">{c.background}</p>
                {c.slate && (
                  <p className="mt-3">
                    <Badge tone="accent">{c.slate}</Badge>
                  </p>
                )}
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Stated priorities
                </p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-muted">
                  {c.priorities.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-border-strong" aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </ul>
        </section>

        <section className="mt-14">
          <SectionHeading title="Before you vote" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="font-semibold text-ink">Check your registration</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                Registration, ballot drop-off locations and your specific ballot come from the
                Santa Clara County Registrar of Voters, not the city.
              </p>
              <div className="mt-4">
                <ButtonLink href={ELECTION.registrarUrl} variant="secondary" external>
                  County Registrar
                </ButtonLink>
              </div>
            </Card>
            <Card>
              <p className="font-semibold text-ink">Read independent coverage</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                This page summarizes candidates neutrally and does not endorse. For reporting on
                the race, see local news coverage.
              </p>
              <div className="mt-4">
                <ButtonLink href={ELECTION.coverageUrl} variant="secondary" external>
                  Candidate coverage
                </ButtonLink>
              </div>
            </Card>
          </div>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-ink-muted">
          Candidate information compiled from public reporting and candidate statements, last
          verified {formatDate(ELECTION.lastVerified)}. This site does not endorse candidates.
          Confirm the official certified candidate list with the County Registrar of Voters.
        </p>
      </Container>
    </>
  );
}
