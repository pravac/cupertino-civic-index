import Anthropic from "@anthropic-ai/sdk";
import { chatTools } from "@/lib/chat-tools";
import { formatDate, todayInCupertino } from "@/lib/format";

// The SDK needs Node APIs, so this route cannot run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

/** Thinking is on by default on this model and shares the max_tokens ceiling
 *  with the reply, so the budget has to cover both or answers truncate. */
const MAX_TOKENS = 16_000;

const MAX_MESSAGES = 20;
const MAX_CHARS = 4_000;

/**
 * Rate limiting, in memory. This bounds one server instance, which is enough
 * to stop a single visitor hammering the endpoint, and explicitly not enough
 * to stop a distributed abuser. A public deployment on serverless gets a fresh
 * map per cold start, so move this to a shared store before relying on it.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const SYSTEM = `You are the assistant for the Cupertino Civic Index, an independent guide to local government in Cupertino, California. Today is ${formatDate(todayInCupertino())}.

Answer questions about Cupertino's city government using your tools. The tools read the city's live records, so prefer calling one over answering from memory, and say plainly when the records do not cover something.

Ground rules:
- Use tools for anything about meetings, agendas, the council, commissions, the election, or news. Do not guess at dates, names, or what a body decided.
- For a question about a specific project, street, address, development, or ordinance, search the city records first. Residents ask about the thing near them, not about the meeting it appeared on, and the record is searchable by keyword. Follow up with a news search for reaction, litigation, and context the record does not carry.
- Cite what you relied on: name the meeting and date, or the outlet for a headline. Attribute news to its publisher rather than stating it as fact.
- Never recommend a candidate, predict an election, or characterize a candidate positively or negatively. Describe each one on the same terms and point people to the county Registrar of Voters for ballot questions.
- The Mayor of Cupertino is appointed by the council from among its five members for a one year term, not elected by voters. Correct that assumption when it comes up.
- A canceled meeting did not happen. Never describe business as conducted at one, even if an agenda was published for it.
- You are not the city. For legal deadlines, official notice, or anything with consequences, tell people to confirm with the city directly and link them there.
- If a question is outside city government, say so briefly and point somewhere useful rather than improvising.
- Never state a URL, phone number, street address, or office hour that did not come back from a tool. If you do not have one, say where to look by name and let the person search for it. A confident wrong link is worse than no link.
- Voting logistics count as election questions: call the election tool for registration, ballots, and deadlines instead of recalling county contact details.

Never use em dashes or en dashes. Use commas, colons, periods, or parentheses.

Keep answers short and direct. Lead with the answer, then the supporting detail. Skip preamble, and do not restate the question. Most questions deserve a few sentences, not a structured report.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "The assistant is not configured. Set ANTHROPIC_API_KEY to enable it." },
      { status: 503 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many questions in a short time. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return Response.json({ error: "No messages supplied." }, { status: 400 });
  }

  // Trust nothing from the client: roles, shapes and sizes are all re-checked.
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text.length === 0) continue;
    messages.push({ role, content: text });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const runner = client.beta.messages.toolRunner({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Low effort keeps a chat answer quick. Thinking stays on: disabling
          // it on this model can make the agent emit a tool call as plain text,
          // which would silently never run.
          output_config: { effort: "low" },
          system: SYSTEM,
          tools: chatTools,
          messages,
          stream: true,
        });

        // The runner yields one stream per turn, so text written before a
        // tool call and text written after it arrive as separate messages.
        // Without a break between them the two run together mid-sentence.
        let wroteText = false;
        for await (const messageStream of runner) {
          let wroteThisTurn = false;
          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              if (wroteText && !wroteThisTurn) {
                controller.enqueue(encoder.encode("\n\n"));
              }
              wroteThisTurn = true;
              wroteText = true;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        }
      } catch (err) {
        console.error("chat route failed", err);
        const message =
          err instanceof Anthropic.RateLimitError
            ? "\n\n[The assistant is rate limited right now. Try again shortly.]"
            : "\n\n[The assistant hit an error and stopped. Try again.]";
        controller.enqueue(encoder.encode(message));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
