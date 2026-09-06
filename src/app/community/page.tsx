import type { Metadata } from "next";
import { CommunityBoard } from "@/components/CommunityBoard";
import { MAX_WORDS, TOPICS } from "@/lib/community";
import { boardReady, readPosts } from "@/lib/community-store";
import { Card, Container, PageHeader, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Community engagement",
  description:
    "What Cupertino residents are saying about the city, the council, and the November 2026 election.",
};

// The board changes whenever someone posts, so it is read per request rather
// than baked into a build that would show a stale page for hours.
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const [posts, ready] = await Promise.all([readPosts(), boardReady()]);

  return (
    <>
      <PageHeader
        eyebrow="Community engagement"
        title="What residents are saying"
        intro={`Residents post here about Cupertino: what the council is doing, what is being built, how the campaign is going, what they are seeing on their street. ${MAX_WORDS} words, sorted into ${TOPICS.length} topics.`}
      />

      <Container className="py-12">
        <Card className="border-l-4 border-l-accent">
          <p className="text-sm font-semibold text-ink">How this board works</p>
          <p className="mt-2 leading-relaxed text-ink-muted">
            Everything here is written by residents, not by this site. Nothing is published
            until it has been read: posts are checked on submission for being about Cupertino
            and current, for profanity and harassment, for anyone&apos;s private information,
            and for unfounded accusations against named people. A post that does not pass comes
            back to you with the reason, so you can rewrite it.
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            You can say what you saw yourself, and you can criticize any public official or
            candidate for their positions, their votes, and what they have said in public.
            Stating as fact that a named person did something wrong, when you are not
            describing something you witnessed, is the line this board does not cross. Posts
            appear under an assigned name, so nobody can post as someone else.
          </p>
        </Card>

        <section className="mt-14">
          <SectionHeading
            title="The board"
            description="Newest first. Filed automatically by topic."
          />
          <CommunityBoard initial={posts} ready={ready} />
        </section>

        <p className="mt-10 text-xs leading-relaxed text-ink-muted">
          Posts are the opinions of the residents who wrote them, not of this site, and this
          site does not verify what they say. Moderation is automated and will get things
          wrong in both directions. For anything with consequences, confirm it with the city
          directly.
        </p>
      </Container>
    </>
  );
}
