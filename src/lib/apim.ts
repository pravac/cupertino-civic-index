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
  // A beta quota, counted only against questions that actually reach the
  // model. Rolling 24 hours rather than a calendar day, so it frees up as the
  // oldest question ages out instead of everything unlocking at midnight.
  perCallerPerDay: 15,
  windowMs: 60_000,
  dayMs: 86_400_000,
};

const hits = new Map<string, number[]>();

function within(key: string, windowMs: number): number[] {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent;
}

function record(key: string, windowMs: number): number {
  const recent = within(key, windowMs);
  recent.push(Date.now());
  // Evict the least recently active callers. Clearing the whole map, as this
  // used to, let anyone forge enough x-forwarded-for values to trip the clear
  // and wipe their own count. Sorting by last hit never evicts an active
  // caller, which is exactly the one whose count has to survive.
  if (hits.size > 20_000) {
    const cold = [...hits].sort((a, b) => a[1][a[1].length - 1] - b[1][b[1].length - 1]);
    for (const [k] of cold.slice(0, 5_000)) hits.delete(k);
  }
  return recent.length;
}

const deny = (status: number, error: string) => Response.json({ error }, { status });

/** The parsed body plus `charge`, or the response to send instead. Call
 *  `charge()` once the request is about to reach the model: the daily quota is
 *  spent on answered questions, so a malformed body does not cost a resident
 *  one of their fifteen. Per-minute limits still count every request, since
 *  those exist to stop hammering rather than to allocate a budget. */
export async function gate(req: Request): Promise<{ body: unknown; charge: () => void } | Response> {
  const leaked = Object.keys(process.env).find((k) => k.startsWith("NEXT_PUBLIC_") && /ANTHROPIC/i.test(k));
  if (leaked) console.error(`${leaked} would ship the API key to the browser. Refusing to serve.`);
  if (leaked || !process.env.ANTHROPIC_API_KEY) {
    return deny(503, "The assistant is not configured. Set ANTHROPIC_API_KEY (server side only) to enable it.");
  }

  const caller =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (
    record(`m:${caller}`, LIMITS.windowMs) > LIMITS.perCallerPerMinute ||
    record("m:*", LIMITS.windowMs) > LIMITS.totalPerMinute
  ) {
    return deny(429, "Too many questions in a short time. Wait a minute and try again.");
  }
  if (within(`d:${caller}`, LIMITS.dayMs).length >= LIMITS.perCallerPerDay) {
    return deny(
      429,
      `This beta answers ${LIMITS.perCallerPerDay} questions a day per visitor, and you have used them. Try again tomorrow, or read the meetings and council pages in the meantime.`,
    );
  }

  // Check the declared length first so an oversized body is refused before it
  // is read, then check what actually arrived, since the header is a claim.
  if (Number(req.headers.get("content-length") ?? 0) > LIMITS.bodyBytes) {
    return deny(413, "That request is too long.");
  }
  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) return deny(413, "That request is too long.");

  try {
    return { body: JSON.parse(raw), charge: () => void record(`d:${caller}`, LIMITS.dayMs) };
  } catch {
    return deny(400, "Malformed request.");
  }
}
