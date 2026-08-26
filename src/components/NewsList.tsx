import type { NewsItem } from "@/lib/types";
import { EmptyState, ExternalIcon } from "./ui";

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const hrs = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState title="No headlines available right now.">
        The news feed could not be reached. Try again shortly.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((item) => (
        <li key={item.url}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start justify-between gap-4 p-4 transition-colors hover:bg-surface-2"
          >
            <div className="min-w-0">
              <p className="font-medium leading-snug text-ink group-hover:underline">{item.title}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {item.source}
                {timeAgo(item.publishedAt) ? ` · ${timeAgo(item.publishedAt)}` : ""}
              </p>
            </div>
            <span className="mt-1 shrink-0 text-ink-muted">
              <ExternalIcon />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
