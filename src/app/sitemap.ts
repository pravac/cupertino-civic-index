import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getUpcomingMeetings, getPastMeetings } from "@/lib/legistar";

export const revalidate = 3600;

/** Static pages plus a URL per meeting, so a search for a specific agenda item
 *  can land on the meeting it belongs to rather than on the index. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/meetings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/election`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/council`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/news`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/participate`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/assistant`, changeFrequency: "monthly", priority: 0.6 },
  ];

  // A failure here must not take the sitemap down: a partial sitemap is worth
  // more to a crawler than a 500.
  try {
    const [upcoming, past] = await Promise.all([getUpcomingMeetings(50), getPastMeetings(50)]);
    const seen = new Set<number>();
    for (const m of [...upcoming.data, ...past.data]) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      pages.push({
        url: `${SITE_URL}/meetings/${m.id}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.error("sitemap: meeting list unavailable, serving static pages only", err);
  }

  return pages;
}
