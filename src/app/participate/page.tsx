import type { Metadata } from "next";
import { getBodies } from "@/lib/legistar";
import { BODY_DESCRIPTIONS, GUIDES } from "@/data/guides";
import { Badge, ButtonLink, Card, Container, EmptyState, PageHeader, SectionHeading, SourceNote } from "@/components/ui";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Participate",
  description:
    "How to speak at a Cupertino council meeting, contact your councilmembers, and join a city commission.",
};

export default async function ParticipatePage() {
  const bodies = await getBodies();
  const commissions = bodies.data.filter((b) => b.name !== "City Council");

  return (
    <>
      <PageHeader
        eyebrow="Get involved"
        title="How to actually be heard"
        intro="Local government is unusually open to anyone who shows up. The hard part is knowing the mechanics. Here they are."
      />
      <Container className="py-12">
        <section>
          <ul className="grid gap-6 lg:grid-cols-2">
            {GUIDES.map((g) => (
              <Card as="li" key={g.slug} className="flex flex-col">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{g.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{g.summary}</p>
                <ol className="mt-4 flex-1 space-y-2.5">
                  {g.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-5">
                  <ButtonLink href={g.officialUrl} variant="secondary" external>
                    {g.officialLabel}
                  </ButtonLink>
                </div>
              </Card>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionHeading
            title="Commissions and committees"
            description="Resident-staffed bodies that shape what reaches the council. Most have open seats at some point each year."
          />
          {commissions.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {commissions.map((b) => (
                <Card as="li" key={b.id}>
                  <p className="font-semibold leading-snug text-ink">{b.name}</p>
                  <div className="mt-2">
                    <Badge>{b.type}</Badge>
                  </div>
                  {BODY_DESCRIPTIONS[b.name] && (
                    <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                      {BODY_DESCRIPTIONS[b.name]}
                    </p>
                  )}
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState title="Commission list unavailable.">
              The city&rsquo;s records system could not be reached.
            </EmptyState>
          )}
          <SourceNote source={bodies} className="mt-4" />
        </section>
      </Container>
    </>
  );
}
