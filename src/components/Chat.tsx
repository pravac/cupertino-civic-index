"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "./Markdown";
import { LANGUAGES, STRINGS, type LanguageCode } from "@/data/chat-i18n";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [lang, setLang] = useState<LanguageCode>("en");
  const t = STRINGS[lang];
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setError(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, language: lang }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? "The assistant could not be reached.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        // Rewrite the trailing assistant message as tokens arrive.
        setMessages([...next, { role: "assistant", content: acc }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages(next);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
          Language
        </span>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            lang={l.code}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              lang === l.code
                ? "border-transparent bg-primary text-primary-fg"
                : "border-border-strong text-ink hover:bg-surface-2"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div
        className="min-h-[22rem] rounded-xl border border-border bg-surface p-5"
        aria-live="polite"
        aria-busy={busy}
      >
        {empty ? (
          <div>
            <p className="text-sm leading-relaxed text-ink-muted" lang={lang}>
              {t.intro}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted" lang={lang}>
              {t.recordsNote}
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
                    lang={lang}
                    className="rounded-full border border-border-strong px-3 py-1.5 text-sm text-ink transition-colors hover:bg-surface-2"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="space-y-5">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-fg">
                    {m.content}
                  </p>
                ) : (
                  <div className="max-w-[95%]">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {t.label}
                    </p>
                    {m.content ? (
                      <Markdown text={m.content} />
                    ) : (
                      <p className="flex items-center gap-2 text-ink-muted">
                        <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
                        {t.thinking}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-warning bg-warning-soft px-4 py-2.5 text-sm text-warning">
          {error}
        </p>
      )}

      <form
        className="mt-4 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          {t.inputLabel}
        </label>
        <textarea
          id="chat-input"
          ref={inputRef}
          rows={2}
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={t.placeholder}
          lang={lang}
          className="min-h-[3.25rem] flex-1 resize-y rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? t.working : t.ask}
        </button>
      </form>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted" lang={lang}>
        {t.disclaimer}
      </p>
    </div>
  );
}
