/**
 * Visit counter, backed by Upstash Redis over its REST API.
 *
 * Serverless instances each hold their own memory and reset on cold start, so
 * an in-process counter would show a different number to every visitor and
 * drift toward zero overnight. A shared store is the only way to make the
 * number mean anything.
 *
 * Uses plain fetch against the REST endpoint rather than a client library:
 * two calls are needed, both are one line, and a dependency for that is not
 * worth the install.
 *
 * With no credentials configured the counter reports null and the header
 * renders nothing, so the site is unaffected either way.
 */
const KEY = "cupertino-civic:visits";

/**
 * Credentials arrive under different names depending on how the store was
 * provisioned: Vercel's marketplace integration sets KV_REST_API_*, while
 * connecting Upstash directly sets UPSTASH_REDIS_REST_*. Accept either rather
 * than depending on which path was taken.
 */
function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function call(path: string): Promise<number | null> {
  const cfg = config();
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const res = await fetch(`${cfg.url}/${path}/${encodeURIComponent(KEY)}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: unknown };
    const n = Number(body.result);
    return Number.isFinite(n) ? n : null;
  } catch {
    // A counter is decoration. It must never take a page or a request down.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Record one visit and return the new total. */
export function recordVisit(): Promise<number | null> {
  return call("incr");
}

/** Read the total without recording anything. */
export function readVisits(): Promise<number | null> {
  return call("get");
}
