"use client";

import { useMemo, useState } from "react";
import { Badge, Card, EmptyState } from "./ui";
import { MAX_WORDS, TOPICS, wordCount, type Post, type Topic } from "@/lib/community";

/**
 * Fixed time zone on purpose. A relative stamp ("4m ago") has to be computed
 * from the reader's clock, which differs from the server's during rendering
 * and makes React discard the markup it just sent. Cupertino's own clock gives
 * the same string on both sides, and this is a Cupertino board.
 */
const TIME = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type Filter = Topic | "All";

export function CommunityBoard({ initial, ready }: { initial: Post[]; ready: boolean }) {
  const [posts, setPosts] = useState(initial);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [busy, setBusy] = useState(false);
  /** A rejection is not an error: the post was read and turned down, and the
   *  author is being asked to rewrite it. Showing the two the same way would
   *  make a considered answer look like a broken form. */
  const [rejected, setRejected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const words = wordCount(draft);
  const over = words > MAX_WORDS;

  const shown = useMemo(
    () => (filter === "All" ? posts : posts.filter((p) => p.topic === filter)),
    [posts, filter],
  );

  /** Only the buckets that have something in them. Six empty headings tell a
   *  reader less than the four that are actually being discussed. */
  const live = useMemo(() => {
    const counts = new Map<Topic, number>();
    for (const p of posts) counts.set(p.topic, (counts.get(p.topic) ?? 0) + 1);
    return TOPICS.filter((t) => counts.has(t)).map((t) => [t, counts.get(t)!] as const);
  }, [posts]);

  async function submit() {
    if (busy || draft.trim().length === 0 || over) return;
    setBusy(true);
    setRejected(null);
    setError(null);
    setPosted(false);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = (await res.json()) as {
        post?: Post;
        rejected?: boolean;
        reason?: string;
        error?: string;
      };
      if (data.post) {
        setPosts((prev) => [data.post!, ...prev]);
        // Only clear the box on a post that went up. A rejected draft is the
        // author's work, and deleting it to make room for the reason would
        // punish them for the rewrite they are being asked to do.
        setDraft("");
        setPosted(true);
      } else if (data.rejected) {
        setRejected(data.reason ?? "This post was not published.");
      } else {
        setError(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Could not reach the board. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <label htmlFor="post" className="text-sm font-semibold text-ink">
          Say something about Cupertino
        </label>
        <p className="mt-1 text-sm text-ink-muted">
          Every post is read before it goes up, so it may take a moment to appear. You post as
          an assigned name, not your own.
        </p>
        <textarea
          id="post"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!ready || busy}
          rows={3}
          placeholder="What are you seeing in your neighborhood, or at City Hall?"
          className="mt-3 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-border-strong disabled:opacity-60"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className={`text-xs ${over ? "text-warning" : "text-ink-muted"}`}>
            {words} of {MAX_WORDS} words
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!ready || busy || over || draft.trim().length === 0}
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Reading your post..." : "Post"}
          </button>
        </div>

        {rejected && (
          <p className="mt-3 rounded-lg border border-l-4 border-border border-l-warning bg-surface-2 px-3 py-2 text-sm text-ink">
            {rejected}
          </p>
        )}
        {error && <p className="mt-3 text-sm text-warning">{error}</p>}
        {posted && <p className="mt-3 text-sm text-success">Posted. It is at the top of the board.</p>}
        {!ready && (
          <p className="mt-3 text-sm text-ink-muted">
            The board is not accepting posts right now.
          </p>
        )}
      </Card>

      {live.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {(["All", ...live.map(([t]) => t)] as Filter[]).map((t) => {
            const count = t === "All" ? posts.length : (live.find(([x]) => x === t)?.[1] ?? 0);
            const on = filter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-transparent bg-primary text-primary-fg"
                    : "border-border text-ink-muted hover:bg-surface-2"
                }`}
              >
                {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {shown.map((p) => (
          <Card as="li" key={p.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{p.handle}</p>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{p.topic}</Badge>
                <span className="text-xs text-ink-muted">{TIME.format(p.createdAt)}</span>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{p.body}</p>
          </Card>
        ))}
      </ul>

      {shown.length === 0 && (
        <div className="mt-4">
          <EmptyState title={posts.length === 0 ? "Nothing on the board yet" : `Nothing under ${filter} yet`}>
            {posts.length === 0
              ? "Be the first to post. Anything about Cupertino and happening now."
              : "Try another topic, or post something under this one."}
          </EmptyState>
        </div>
      )}
    </>
  );
}
