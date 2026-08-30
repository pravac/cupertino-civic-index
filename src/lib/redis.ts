/**
 * Minimal Upstash Redis access over its REST API.
 *
 * Plain fetch rather than a client library: the whole surface used here is a
 * pipelined list of commands, and a dependency for that is not worth the
 * install. Credentials arrive under different names depending on how the store
 * was provisioned, so accept either rather than depending on which path was
 * taken: Vercel's marketplace integration sets KV_REST_API_*, connecting
 * Upstash directly sets UPSTASH_REDIS_REST_*.
 */
export function redisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/**
 * Run commands in one round trip and return their results in order, or null if
 * the store is unconfigured, slow, or failing. Callers decide what a null
 * means for them: a limiter falls back to its local counters rather than
 * taking the site down because a cache blinked.
 */
export async function pipeline(commands: string[][]): Promise<unknown[] | null> {
  const cfg = redisConfig();
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_000);
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{ result?: unknown; error?: string }>;
    if (!Array.isArray(body) || body.some((r) => r.error)) return null;
    return body.map((r) => r.result ?? null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
