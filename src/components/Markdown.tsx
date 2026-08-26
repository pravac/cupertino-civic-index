import type { ReactNode } from "react";

/**
 * A deliberately small renderer for the subset of Markdown the assistant
 * actually emits: paragraphs, bullets, bold, and links.
 *
 * Written by hand rather than pulled from a library because it builds React
 * elements directly. Nothing is ever injected as HTML, so a link or a bold
 * span in model output cannot become markup, which is the failure mode that
 * matters when the text is generated rather than authored.
 */

/** Links are the whole point of a citation, so they must survive, but only
 *  to schemes a browser should follow from generated text. */
function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  // One pass over links and bold, in order of appearance.
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      const href = safeHref(m[2]);
      out.push(
        href ? (
          <a
            key={`${keyBase}-a${i}`}
            href={href}
            target="_blank"
            rel="noreferrer nofollow"
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
          >
            {m[1]}
          </a>
        ) : (
          m[1]
        ),
      );
    } else {
      out.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-ink">
          {m[3]}
        </strong>,
      );
    }
    last = pattern.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-3 leading-relaxed text-ink">
      {blocks.map((block, b) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l) || l.trim() === "");
        if (isList) {
          const items = lines.filter((l) => l.trim() !== "");
          return (
            <ul key={b} className="space-y-1.5 pl-1">
              {items.map((l, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-border-strong" aria-hidden />
                  <span>{inline(l.replace(/^\s*[-*]\s+/, ""), `${b}-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={b}>{inline(block.replace(/\n/g, " "), String(b))}</p>;
      })}
    </div>
  );
}
