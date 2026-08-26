import type { Metadata } from "next";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/legistar";
import { MeetingCard } from "@/components/MeetingCard";
import { Container, EmptyState, PageHeader, SectionHeading, SourceNote } from "@/components/ui";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Meetings",
  description:
    "Every upcoming and recent public meeting of the Cupertino City Council, its commissions and its committees.",
};

export default async function MeetingsPage() {
  const [upcoming, past] = await Promise.all([getUpcomingMeetings(30), getPastMeetings(12)]);

  return (
    <>
      <PageHeader
        eyebrow="Public meetings"
        title="Meetings and agendas"
        intro="Every public meeting of the council, its commissions and its committees — pulled live from the city's official records system as soon as staff publish them."
      />
      <Container className="py-12">
        <section>
          <SectionHeading
            title="Upcoming"
            description="Scheduled meetings, soonest first. Agendas post shortly before each meeting."
          />
          {upcoming.data.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {upcoming.data.map((m) => (
                <MeetingCard key={m.id} meeting={m} showCountdown />
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing on the calendar yet.">
              {upcoming.health === "unavailable"
                ? "The city's meeting system could not be reached. Try again shortly."
                : "Meetings appear here as soon as the city schedules them."}
            </EmptyState>
          )}
          <SourceNote source={upcoming} className="mt-4" />
        </section>

        <section className="mt-16">
          <SectionHeading
            title="Recently held"
            description="Catch up on what was decided. Minutes attach once approved."
          />
          {past.data.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {past.data.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </ul>
          ) : (
            <EmptyState title="No recent meetings found." />
          )}
          <SourceNote source={past} className="mt-4" />
        </section>
      </Container>
    </>
  );
}
