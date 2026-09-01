import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The API routes are machinery, not pages: no crawler benefit, and the chat
 *  endpoint costs money per request. Everything a resident reads is open. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
