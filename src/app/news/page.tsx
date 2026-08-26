import type { Metadata } from "next";
import { NEWS_TOPICS, getNews } from "@/lib/news";
import { NewsList } from "@/components/NewsList";
import { Container, PageHeader, SectionHeading, SourceNote } from "@/components/ui";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Local News",
  description:
    "Recent news about Cupertino, California, covering city hall, housing, schools and community, linked to the original publishers.",
};

export default async function NewsPage() {
  const news = await getNews(60);

  return (
    <>
      <PageHeader
        eyebrow="Local news"
        title="What's being reported about Cupertino"
        intro="Headlines gathered from local and regional outlets, grouped by topic. Every link goes straight to the publisher. Nothing is reproduced here."
      />
      <Container className="py-12">
        {NEWS_TOPICS.map((topic) => {
          const items = news.data.filter((i) => i.topic === topic.key);
          if (items.length === 0) return null;
          return (
            <section key={topic.key} className="mb-14 last:mb-0">
              <SectionHeading title={topic.label} description={topic.description} />
              <NewsList items={items.slice(0, 12)} />
            </section>
          );
        })}

        {news.data.length === 0 && (
          <NewsList items={[]} />
        )}

        <SourceNote source={news} className="mt-6" />
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Headlines are aggregated automatically and are not selected or edited by this site.
          Inclusion is not an endorsement of a publisher or a story&rsquo;s accuracy.
        </p>
      </Container>
    </>
  );
}
