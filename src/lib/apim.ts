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
 * Counters live in Redis, so the limits hold across every serverless instance
 * and survive cold starts. That matters most for the daily quota: an in-memory
 * count of "15 a day" is really 15 per instance per cold start, which on Vercel
 * is no quota at all. When the store is unreachable the local counters take
 * over, which bounds one instance rather than nothing. A cache blinking should
 * loosen the limits, never take the assistant down.
 */
import { todayInCupertino } from "./format";
import { pipeline } from "./redis";
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
  // model, and reset at midnight on the city's own clock rather than UTC.
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

/**
 * Redis keys. The minute key carries its own bucket number, so a window is a
 * fresh key that expires on its own rather than a list anyone has to prune.
 * Fixed windows do let a caller straddle a boundary and send two windows' worth
 * back to back; for a limit whose job is to stop hammering that is fine, and
 * the daily quota is what actually bounds the day.
 */
const minuteKey = (caller: string) => `cc:m:${caller}:${Math.floor(Date.now() / LIMITS.windowMs)}`;
const dayKey = (caller: string) => `cc:d:${caller}:${todayInCupertino()}`;

type Verdict = "ok" | "minute" | "day";

/** Counts this request against the shared minute windows and reads the day's
 *  quota, in one round trip. Null means the store did not answer. */
async function sharedCheck(caller: string): Promise<Verdict | null> {
  const mine = minuteKey(caller);
  const all = minuteKey("*");
  const day = dayKey(caller);
  const res = await pipeline([
    ["INCR", mine],
    ["EXPIRE", mine, "120"],
    ["INCR", all],
    ["EXPIRE", all, "120"],
    ["GET", day],
  ]);
  if (!res) return null;

  const [mineCount, , allCount, , dayCount] = res;
  if (Number(mineCount) > LIMITS.perCallerPerMinute) return "minute";
  if (Number(allCount) > LIMITS.totalPerMinute) return "minute";
  if (Number(dayCount ?? 0) >= LIMITS.perCallerPerDay) return "day";
  return "ok";
}

/** The same decision from local memory, used when the store is unreachable. */
function localCheck(caller: string): Verdict {
  if (
    record(`m:${caller}`, LIMITS.windowMs) > LIMITS.perCallerPerMinute ||
    record("m:*", LIMITS.windowMs) > LIMITS.totalPerMinute
  ) {
    return "minute";
  }
  return within(`d:${caller}`, LIMITS.dayMs).length >= LIMITS.perCallerPerDay ? "day" : "ok";
}

/** Spends one question and returns how many the caller has left, so the
 *  counter in the interface costs no extra round trip. */
async function spendDaily(caller: string): Promise<number> {
  const day = dayKey(caller);
  // Two days of expiry so the key certainly outlives the day it counts,
  // whatever the clock does around a daylight saving change.
  const res = await pipeline([["INCR", day], ["EXPIRE", day, "172800"]]);
  const used = res ? Number(res[0]) : record(`d:${caller}`, LIMITS.dayMs);
  return Math.max(0, LIMITS.perCallerPerDay - used);
}

/** Which visitor a request is from. The first x-forwarded-for hop only: the
 *  rest are client supplied and would let anyone claim a fresh identity. */
export function callerFrom(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** How many questions this visitor has left today, without spending one. */
export async function questionsLeft(caller: string): Promise<number> {
  const res = await pipeline([["GET", dayKey(caller)]]);
  const used = res ? Number(res[0] ?? 0) : within(`d:${caller}`, LIMITS.dayMs).length;
  return Math.max(0, LIMITS.perCallerPerDay - used);
}

const deny = (status: number, error: string, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });

/** The parsed body plus `charge`, or the response to send instead. Call
 *  `charge()` once the request is about to reach the model: the daily quota is
 *  spent on answered questions, so a malformed body does not cost a resident
 *  one of their fifteen. Per-minute limits still count every request, since
 *  those exist to stop hammering rather than to allocate a budget. */
export async function gate(
  req: Request,
): Promise<{ body: unknown; charge: () => Promise<number> } | Response> {
  const leaked = Object.keys(process.env).find((k) => k.startsWith("NEXT_PUBLIC_") && /ANTHROPIC/i.test(k));
  if (leaked) console.error(`${leaked} would ship the API key to the browser. Refusing to serve.`);
  if (leaked || !process.env.ANTHROPIC_API_KEY) {
    return deny(503, "The assistant is not configured. Set ANTHROPIC_API_KEY (server side only) to enable it.");
  }

  const caller = callerFrom(req);
  const verdict = (await sharedCheck(caller)) ?? localCheck(caller);
  if (verdict === "minute") {
    return deny(429, "Too many questions in a short time. Wait a minute and try again.");
  }
  if (verdict === "day") {
    return deny(
      429,
      `This beta answers ${LIMITS.perCallerPerDay} questions a day per visitor, and you have used them. Try again tomorrow, or read the meetings and council pages in the meantime.`,
      { "X-Questions-Left": "0" },
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
    return { body: JSON.parse(raw), charge: () => spendDaily(caller) };
  } catch {
    return deny(400, "Malformed request.");
  }
}
