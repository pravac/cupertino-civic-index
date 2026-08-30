/**
 * Token accounting for the assistant route.
 *
 * Without this the cost of a question is guesswork: the tool runner makes
 * several model calls per question, each resending a system prompt and ten tool
 * schemas, and none of it is visible from outside. Logging what each question
 * actually consumed turns every later cost decision into an evidence-based one,
 * and is the only way to tell whether prompt caching is working: a cache_read
 * stuck at zero across repeated questions means something is silently
 * invalidating the prefix.
 */

/** Dollars per million tokens for the model the chat route uses. Cache reads
 *  bill at a tenth of input, cache writes at 1.25x. */
const PRICE = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

export interface Usage {
  /** Model calls made while answering one question. */
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const emptyUsage = (): Usage => ({
  calls: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
});

export function estimateCost(u: Usage): number {
  return (
    (u.input * PRICE.input +
      u.output * PRICE.output +
      u.cacheRead * PRICE.cacheRead +
      u.cacheWrite * PRICE.cacheWrite) /
    1_000_000
  );
}

/** One line per question, greppable in the platform logs. */
export function logUsage(u: Usage): void {
  const cached = u.cacheRead + u.cacheWrite;
  const hitRate = cached > 0 ? Math.round((u.cacheRead / cached) * 100) : 0;
  console.log(
    `chat usage calls=${u.calls} input=${u.input} cache_read=${u.cacheRead} ` +
      `cache_write=${u.cacheWrite} cache_hit=${hitRate}% output=${u.output} ` +
      `est_usd=${estimateCost(u).toFixed(4)}`,
  );
}
