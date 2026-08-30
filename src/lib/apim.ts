/**
 * A small gateway in front of the assistant route: the one place that decides
 * whether a request gets to become a billable model call.
 *
 *  1. Key custody. The key is read from the server process and never leaves it.
 *     A NEXT_PUBLIC_ copy would be inlined into the browser bundle, so treat
 *     one as a misconfiguration rather than as a working key.
 *  2. Rate limiting, per caller and in total, because the cost of this endpoint
 *     is otherwise whatever a script decides to spend.
 *  3. Input caps, because a long prompt is a large bill. The body is capped
 *     before it is parsed, and the conversation before it is sent.
 *
 * The counters live in memory, which bounds one server instance: enough to stop
 * one visitor hammering the endpoint, not enough to stop a distributed abuser,
 * and reset on every serverless cold start. Move them to a shared store before
 * treating these numbers as real limits.
 */
export const LIMITS = {
  // Room for a full-length legitimate conversation (messages x messageChars,
  // plus JSON overhead) so a 413 means abuse, not a long chat. Nothing past
  // conversationChars ever reaches the model regardless of what fits here.
  bodyBytes: 128_000,
  messageChars: 4_000,
  conversationChars: 24_000,
  messages: 20,
  perCallerPerMinute: 10,
  totalPerMinute: 120,
  windowMs: 60_000,
};

const hits = new Map<string, number[]>();

function overLimit(key: string, max: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < LIMITS.windowMs);
  recent.push(now);
  hits.set(key, recent);
  // Drop only callers whose window has expired. Clearing the whole map would
  // hand an abuser a way to reset everyone else's count by growing it.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) if (now - v[v.length - 1] >= LIMITS.windowMs) hits.delete(k);
  }
  return recent.length > max;
}

const deny = (status: number, error: string) => Response.json({ error }, { status });

/** Returns the parsed body, or the response to send instead. */
export async function gate(req: Request): Promise<{ body: unknown } | Response> {
  const leaked = Object.keys(process.env).find((k) => k.startsWith("NEXT_PUBLIC_") && /ANTHROPIC/i.test(k));
  if (leaked) console.error(`${leaked} would ship the API key to the browser. Refusing to serve.`);
  if (leaked || !process.env.ANTHROPIC_API_KEY) {
    return deny(503, "The assistant is not configured. Set ANTHROPIC_API_KEY (server side only) to enable it.");
  }

  const caller =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (overLimit(caller, LIMITS.perCallerPerMinute) || overLimit("*", LIMITS.totalPerMinute)) {
    return deny(429, "Too many questions in a short time. Wait a minute and try again.");
  }

  // Check the declared length first so an oversized body is refused before it
  // is read, then check what actually arrived, since the header is a claim.
  if (Number(req.headers.get("content-length") ?? 0) > LIMITS.bodyBytes) {
    return deny(413, "That request is too long.");
  }
  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) return deny(413, "That request is too long.");

  try {
    return { body: JSON.parse(raw) };
  } catch {
    return deny(400, "Malformed request.");
  }
}
