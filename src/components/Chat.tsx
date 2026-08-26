"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "When does the City Council meet next?",
  "Who is on the council right now?",
  "How do I speak at a meeting?",
  "Who is running in November, and for what?",
  "What did the council do in July?",
];

export function Chat() {
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
        body: JSON.stringify({ messages: next }),
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
      <div
        className="min-h-[22rem] rounded-xl border border-border bg-surface p-5"
        aria-live="polite"
        aria-busy={busy}
      >
        {empty ? (
          <div>
            <p className="text-sm leading-relaxed text-ink-muted">
              Ask about meetings, agendas, the council, commissions, the November election, or
              local news. Answers come from the city&rsquo;s own records.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => send(s)}
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
                      Civic Index
                    </p>
                    {m.content ? (
                      <div className="space-y-3 leading-relaxed text-ink">
                        {m.content.split("\n\n").map((para, n) => (
                          <p key={n} className="whitespace-pre-wrap">
                            {para}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="flex items-center gap-2 text-ink-muted">
                        <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
                        Checking the city&rsquo;s records
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
          Ask a question about Cupertino city government
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
          placeholder="Ask about meetings, the council, the election..."
          className="min-h-[3.25rem] flex-1 resize-y rounded-lg border border-border-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? "Working" : "Ask"}
        </button>
      </form>

      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        Answers are generated and can be wrong. This site is not the City of Cupertino. Confirm
        anything with legal or financial consequences against the city&rsquo;s official records.
      </p>
    </div>
  );
}
