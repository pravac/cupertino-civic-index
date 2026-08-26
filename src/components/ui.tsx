import Link from "next/link";
import type { ReactNode } from "react";
import type { SourceHealth, Sourced } from "@/lib/types";
import { formatRelativeTimestamp } from "@/lib/format";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
}) {
  return (
    <Tag
      className={`rounded-xl border border-border bg-surface p-5 transition-colors ${className}`}
    >
      {children}
    </Tag>
  );
}

export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface-2">
      <Container className="py-10 sm:py-14">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{intro}</p>}
        {children && <div className="mt-5">{children}</div>}
      </Container>
    </header>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "primary" | "accent" | "success";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-muted border-border",
  primary: "bg-primary-soft text-primary border-transparent",
  accent: "bg-accent-soft text-accent border-transparent",
  success: "bg-success-soft text-success border-transparent",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Tells residents where a number came from and how fresh it is. Trust in a
 *  civic tool depends on never quietly presenting stale data as current. */
export function SourceNote({ source, className = "" }: { source: Sourced<unknown>; className?: string }) {
  const labels: Record<SourceHealth, string> = {
    live: "Live",
    curated: "Partially available",
    unavailable: "Unavailable",
  };
  const dot: Record<SourceHealth, string> = {
    live: "bg-success",
    curated: "bg-accent",
    unavailable: "bg-ink-muted",
  };
  return (
    <p className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted ${className}`}>
      <span className={`inline-block size-1.5 rounded-full ${dot[source.health]}`} aria-hidden />
      <span>
        {labels[source.health]} · {source.origin} · updated{" "}
        {formatRelativeTimestamp(source.fetchedAt)}
      </span>
      {source.error && <span className="text-accent">{source.error}</span>}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-muted">{children}</div>}
    </Card>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
}) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-fg hover:bg-primary-hover"
      : "border border-border-strong text-ink hover:bg-surface-2";
  const cls = `inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles}`;
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer">
        {children}
        <ExternalIcon />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0 opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
      <path d="M9.5 2H14v4.5M14 2 7 9" />
    </svg>
  );
}
