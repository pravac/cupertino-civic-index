"use client";

import { useEffect, useState } from "react";

/**
 * Total visits, shown in the header.
 *
 * Counting happens here rather than during page render because pages are
 * cached: a server-side increment would count regenerations rather than
 * people, and would report the same stale number until the cache expired.
 *
 * One visit is recorded per browser session. Later page views in the same
 * session read the total without adding to it, so clicking around the site
 * does not inflate the figure.
 */
const SESSION_KEY = "cci-counted";

export function VisitCount() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const counted = sessionStorage.getItem(SESSION_KEY) === "1";

    fetch("/api/visit", { method: counted ? "GET" : "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total?: number | null } | null) => {
        if (cancelled || typeof d?.total !== "number") return;
        sessionStorage.setItem(SESSION_KEY, "1");
        setTotal(d.total);
      })
      .catch(() => {
        /* The counter is decoration; a failure shows nothing. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Render nothing until there is a real number, so the header never shows a
  // placeholder or a zero that is really "not loaded yet".
  if (total === null) return null;

  return (
    <span className="hidden items-center gap-1.5 text-xs text-ink-muted sm:inline-flex tabular-nums">
      <span className="uppercase tracking-wider">Users</span>
      <span className="font-medium text-ink">{total.toLocaleString("en-US")}</span>
    </span>
  );
}
