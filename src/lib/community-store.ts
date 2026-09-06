/**
 * Where posts are kept: Upstash Redis, reached over its REST API like the rest
 * of the site's shared state.
 *
 * Split from `community.ts` so the vocabulary (topics, the word limit, the
 * handle derivation) can be imported by the browser without dragging the store
 * and its credentials into the client bundle.
 *
 * Two keys rather than one: a hash holding each post by id, and a sorted set
 * ordering the ids by time. Storing whole posts as sorted-set members would
 * read the same and make deleting one require the exact bytes it was written
 * with, which a report button cannot count on having.
 */
import { pipeline } from "./redis";
import type { Post } from "./community";

/** How many posts the board keeps. Older ones fall off the end rather than
 *  accumulating forever in a store nobody prunes. */
const KEEP = 200;

const POSTS = "cc:ce:posts";
const FEED = "cc:ce:feed";

/**
 * Newest first. Returns an empty list when the store is unconfigured or
 * unreachable, so the page renders its empty state rather than failing: a
 * board that cannot load is a worse outcome than a board with nothing in it,
 * and the two look the same to a reader anyway.
 */
export async function readPosts(limit = 60): Promise<Post[]> {
  const ids = await pipeline([["ZRANGE", FEED, "0", String(limit - 1), "REV"]]);
  const list = (ids?.[0] as string[] | undefined) ?? [];
  if (list.length === 0) return [];

  const raw = await pipeline([["HMGET", POSTS, ...list]]);
  const rows = (raw?.[0] as (string | null)[] | undefined) ?? [];
  return rows.flatMap((row) => {
    if (!row) return [];
    try {
      return [JSON.parse(row) as Post];
    } catch {
      // One unreadable row must not empty the board.
      return [];
    }
  });
}

/**
 * Store a post that has already passed moderation. Returns false when the
 * store did not accept it, which the route reports honestly rather than
 * showing the poster a success that did not happen.
 */
export async function savePost(post: Post): Promise<boolean> {
  const res = await pipeline([
    ["HSET", POSTS, post.id, JSON.stringify(post)],
    ["ZADD", FEED, String(post.createdAt), post.id],
  ]);
  if (!res) return false;

  // Trim opportunistically, after the write rather than before it, so a
  // failure here costs the board its oldest posts and never the new one.
  const stale = await pipeline([["ZRANGE", FEED, "0", String(-KEEP - 1)]]);
  const drop = (stale?.[0] as string[] | undefined) ?? [];
  if (drop.length > 0) {
    await pipeline([["HDEL", POSTS, ...drop], ["ZREM", FEED, ...drop]]);
  }
  return true;
}

/** Remove one post. For the report queue and for whoever is minding the
 *  board: moderation catching almost everything is not the same as catching
 *  everything, and there has to be a way to take something down. */
export async function deletePost(id: string): Promise<boolean> {
  const res = await pipeline([["HDEL", POSTS, id], ["ZREM", FEED, id]]);
  return Boolean(res);
}

/** Whether the board can store anything at all. Without Redis the page says so
 *  plainly instead of accepting posts into nowhere. */
export async function boardReady(): Promise<boolean> {
  const res = await pipeline([["PING"]]);
  return Boolean(res);
}

export const POST_LIMITS = {
  perCallerPerHour: 5,
  perCallerPerDay: 15,
};

/**
 * Posting limits, separate from the assistant's. A board needs a different
 * shape of limit than a chat: the thing to prevent is one person filling the
 * page, which is an hourly problem, not a per-minute one.
 *
 * Fails open when the store is unreachable, matching the rest of the site. A
 * cache outage should not silence the board, and every post still has to pass
 * moderation before it appears.
 */
export async function postingAllowed(caller: string): Promise<"ok" | "hour" | "day"> {
  const hour = `cc:ce:h:${caller}:${Math.floor(Date.now() / 3_600_000)}`;
  const day = `cc:ce:d:${caller}:${Math.floor(Date.now() / 86_400_000)}`;
  const res = await pipeline([
    ["INCR", hour],
    ["EXPIRE", hour, "7200"],
    ["INCR", day],
    ["EXPIRE", day, "172800"],
  ]);
  if (!res) return "ok";
  if (Number(res[0]) > POST_LIMITS.perCallerPerHour) return "hour";
  if (Number(res[2]) > POST_LIMITS.perCallerPerDay) return "day";
  return "ok";
}
