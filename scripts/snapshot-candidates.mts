/**
 * Captures what each candidate publishes about themselves, in their own words.
 *
 * Why a browser and not fetch: campaign sites are built on page builders that
 * render client side. A plain fetch of one of these returns a bare header and
 * nothing else, which would look like a successful capture of an empty page.
 * This drives the Chrome already on the machine over the DevTools protocol, so
 * there is no dependency to install and nothing extra ships to the deploy host.
 *
 * Nothing here summarizes or characterizes. It stores the candidate's own text
 * with the URL and the date it was read, so the assistant can quote and link
 * rather than paraphrase. Summarizing is where a neutral pipeline stops being
 * neutral, and it is not this script's job.
 *
 *   npm run snapshot:candidates
 */
import { writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { ELECTION } from "../src/data/election";

const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
/** Enough to quote from, small enough that the whole file stays reviewable in
 *  a diff and a tool result stays inside a sane context budget. */
const MAX_CHARS = 24_000;

interface Capture {
  candidate: string;
  url: string;
  label: string;
  title: string;
  text: string;
  /** Whether the candidate's own name appears on the page. A page that does
   *  not name them is not evidence about them, however the link was found. */
  namePresent: boolean;
  error?: string;
}

const targets = ELECTION.candidates.flatMap((c) =>
  c.sources.map((s) => ({ candidate: c.name, url: s.url, label: s.label })),
);
const missing = ELECTION.candidates.filter((c) => c.sources.length === 0);

if (targets.length === 0) {
  console.error("No confirmed candidate sources to capture. Add them to src/data/election.ts.");
  process.exit(1);
}

const chrome = spawn(CHROME, [
  "--headless",
  "--disable-gpu",
  "--no-sandbox",
  `--remote-debugging-port=${PORT}`,
  "about:blank",
]);
process.on("exit", () => chrome.kill());

async function connect(): Promise<WebSocket> {
  for (let i = 0; i < 30; i++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()) as Array<{
        type: string;
        webSocketDebuggerUrl: string;
      }>;
      const page = list.find((t) => t.type === "page");
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((res) => (ws.onopen = res));
        return ws;
      }
    } catch {
      /* Chrome is still starting. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Could not reach Chrome on port ${PORT}. Set CHROME_PATH if it is elsewhere.`);
}

const ws = await connect();
let id = 0;
const pending = new Map<number, (v: unknown) => void>();
ws.onmessage = (m) => {
  const d = JSON.parse(String(m.data));
  const resolve = pending.get(d.id);
  if (resolve) {
    pending.set(d.id, resolve);
    pending.delete(d.id);
    resolve(d.result);
  }
};
const send = (method: string, params: Record<string, unknown> = {}) =>
  new Promise<Record<string, never>>((res) => {
    const i = ++id;
    pending.set(i, res as (v: unknown) => void);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const captures: Capture[] = [];
for (const t of targets) {
  process.stdout.write(`  ${t.candidate}: ${t.url} ... `);
  try {
    await send("Page.enable");
    await send("Page.navigate", { url: t.url });
    // No load event to wait on that means anything for a client-rendered page,
    // so give the bundle a fixed budget to paint.
    await new Promise((r) => setTimeout(r, 6_000));
    const evaluated = (await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        title: document.title || "",
        text: (document.body ? document.body.innerText : "").replace(/\\n{3,}/g, "\\n\\n").trim()
      })`,
      returnByValue: true,
    })) as unknown as { result: { value: string } };
    const { title, text } = JSON.parse(evaluated.result.value) as { title: string; text: string };
    const surname = t.candidate.split(" ").pop() ?? t.candidate;
    captures.push({
      candidate: t.candidate,
      url: t.url,
      label: t.label,
      title,
      text: text.slice(0, MAX_CHARS),
      namePresent: new RegExp(surname, "i").test(`${title}\n${text}`),
    });
    console.log(`${text.length} chars`);
  } catch (err) {
    captures.push({
      candidate: t.candidate,
      url: t.url,
      label: t.label,
      title: "",
      text: "",
      namePresent: false,
      error: err instanceof Error ? err.message : String(err),
    });
    console.log("FAILED");
  }
}
ws.close();
chrome.kill();

const usable = captures.filter((c) => !c.error && c.namePresent && c.text.length > 200);
if (usable.length === 0) {
  console.error("\nRefusing to write: nothing usable was captured.");
  process.exit(1);
}

writeFileSync(
  "src/data/candidate-snapshot.json",
  JSON.stringify({ capturedAt: new Date().toISOString(), cycle: ELECTION.date, captures }, null, 2) + "\n",
);

console.log(`\nWrote ${usable.length} of ${captures.length} captures.`);
for (const c of captures.filter((c) => c.error || !c.namePresent)) {
  console.log(`  CHECK ${c.candidate} ${c.url}: ${c.error ?? "page never names them"}`);
}
for (const c of missing) console.log(`  NO SOURCE YET: ${c.name}`);
