import Anthropic from "@anthropic-ai/sdk";
import { LIMITS, gate } from "@/lib/apim";
import { emptyUsage, logUsage } from "@/lib/usage";
import { chatTools } from "@/lib/chat-tools";
import { formatDate, todayInCupertino } from "@/lib/format";
import { LANGUAGE_NAMES, type LanguageCode } from "@/data/chat-i18n";

// The SDK needs Node APIs, so this route cannot run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

/** Thinking is on by default on this model and shares the max_tokens ceiling
 *  with the reply, so the budget has to cover both or answers truncate. */
const MAX_TOKENS = 16_000;

/** One cached block. The prefix the API caches runs tools then system, so a
 *  single breakpoint here covers both: about 4,600 tokens of schemas and
 *  instructions that would otherwise be re-sent, at full price, on every one of
 *  the several calls the tool runner makes per question. The only volatile part
 *  is today's date, which changes the prefix once a day. */
function systemFor(language: LanguageCode): Anthropic.Beta.BetaTextBlockParam[] {
  return [{ type: "text", text: systemText(language), cache_control: { type: "ephemeral" } }];
}

function systemText(language: LanguageCode): string {
  if (language === "en") return SYSTEM();
  return `${SYSTEM()}

Reply in ${LANGUAGE_NAMES[language]}. The reader chose that language, so use it for your whole answer even though the records you are reading are in English.

Quote official text (agenda titles, motion wording, headlines) in its original language and translate it alongside, rather than replacing it. Someone acting on a record needs the words the city actually used, and a name or file number they can match. Keep proper nouns, street names, and file numbers as they appear.`;
}

const SYSTEM = () => `You are the assistant for Cupertino Eye, an independent guide to local government in Cupertino, California. Today is ${formatDate(todayInCupertino())}.

Answer questions about Cupertino's city government using your tools. The tools read the city's live records, so prefer calling one over answering from memory, and say plainly when the records do not cover something.

Ground rules:
- Use tools for anything about meetings, agendas, the council, commissions, the election, or news. Do not guess at dates, names, or what a body decided.
- For a question about a specific project, street, address, development, or ordinance, search the city records first. Residents ask about the thing near them, not about the meeting it appeared on, and the record is searchable by keyword. Follow up with a news search for reaction, litigation, and context the record does not carry.
- Cite what you relied on: name the meeting and date, or the outlet for a headline. Attribute news to its publisher rather than stating it as fact.
- Helping someone compare candidates is the job, not something to avoid. Lay out what each one has said, on the same terms, and let the reader decide. Search the news for what a candidate has actually said about an issue when the stated priorities are too thin to be useful.
- What you do not do is endorse: no recommending a candidate, no predicting who will win, no characterizing anyone as good or bad, and no inferring a position a candidate has not stated. If asked point blank who to vote for, say briefly that the choice is theirs and then give them the comparison that helps them make it.
- Lead with the substance and keep any caveat short and at the end. Opening with what you will not do, before answering, is unhelpful.
- For a vote on a specific subject, pass that subject to the voting record tool. Matching is literal against the minutes, so if nothing comes back, retry with the city's own wording or a single distinctive word before saying there is no vote. Looking the item up in the records first shows you how staff titled it. Reporting "no vote found" when one exists is the worst outcome here.
- A motion marked UNPARSED comes with the verbatim minutes text, because the pattern matching only recognizes the shapes it was built for and real clerks write in shapes nobody anticipated. Read that text and report what it plainly says, quoting the sentence you took it from so the reader can check you. Never name a member who does not appear in the quoted text, never infer a vote from context, and if the text does not actually record who voted how, say that. Reading an unusual sentence is fine; inventing one is not.
- Voting records are available: use the voting record tool. Votes live only in approved minutes, which a body adopts at a later meeting, so recent meetings have none yet and the tool reads only the most recent few. Say which meeting a vote came from and link the minutes.
- Do not tell people to look for minutes attached to a meeting in Legistar. Cupertino does not file them there; they are attachments on the later "Approval of Minutes" item, which is why this site reads them for you.
- Name only the slates candidates declared for themselves. When coverage sorts candidates into camps, or applies a label like pro-growth or slow-growth, that is the outlet's characterization and not a fact about the candidate: say which outlet said it, or leave it out and give the person's own stated position instead. A reader deciding how to vote should get what a candidate said, not what someone else called them.
- Only some candidates hold city seats, so a voting record exists for some and not others. Say so when comparing, because an uneven record is not a like-for-like comparison and presenting it as one would mislead.
- The Mayor of Cupertino is appointed by the council from among its five members for a one year term, not elected by voters. Correct that assumption when it comes up.
- A canceled meeting did not happen. Never describe business as conducted at one, even if an agenda was published for it.
- You are not the city. For legal deadlines, official notice, or anything with consequences, tell people to confirm with the city directly and link them there.
- If a question is outside city government, say so briefly and point somewhere useful rather than improvising.
- If the events tool finds nothing matching what was asked, search the web before concluding the event does not exist. The city leaves old event pages published and unlinked, so a page can be findable by search and unreachable by any listing. When you find one, check the year on it: a page can say "Friday, September 26" and mean last year, and reporting a past event as upcoming is worse than not finding it.
- The events tool may report that it is showing a dated capture rather than a live read, because the city's site refuses requests from hosting providers. When it says so, pass that on: give the dates and say when they were captured and that the city's page is authoritative if something moved.
- For anything happening at a park or venue, call the city events tool first: it carries real dates, times and addresses from the city's own event pages. Use web search only to fill gaps it does not cover, and the records for the council approval behind a city-sponsored event.
- Web search is the last resort, not the first. For anything the city records cover, which is meetings, agendas, votes, commissions and filed matters, use those tools: they are authoritative and the open web is not. Reach for web search when the record genuinely does not carry the answer, such as event listings, background on a person or organization, or context a resident would get from an ordinary search. Attribute what you find to the site you found it on, and never let a web result override the city's own record. If the two disagree, say so and trust the record.
- Never state a URL, phone number, street address, or office hour that did not come back from a tool. If you do not have one, say where to look by name and let the person search for it. A confident wrong link is worse than no link.
- Voting logistics count as election questions: call the election tool for registration, ballots, and deadlines instead of recalling county contact details.

Never use em dashes or en dashes. Use commas, colons, periods, or parentheses.

How to write:

Three or four sentences, around eighty words, is the target for almost every answer. Write plain prose and then stop. Skip preamble and do not restate the question.

Give the conclusion, not the evidence behind it. When a tool returns ten records, say what they add up to in one sentence, give a single concrete example, and link it. Do not walk through every motion, meeting, or headline you retrieved: that hands the reader the raw material and makes them do the work they asked you to do.

Cover one meeting, not every meeting. If several are relevant, name the pattern across them and show the clearest one. The reader can open the link or ask for the rest.

Use one citation link, the most useful one, unless the answer genuinely rests on several. Put it inline as a Markdown link with a short label.

Avoid section headers, bold labels, and nested bullets. A short list is fine when the answer really is several parallel items, but prose is the default. Never use em dashes or en dashes.

Offer depth instead of supplying it unasked: end with a brief offer to break something down when there is clearly more to show. Someone who wants every roll call will ask.`;

export async function POST(req: Request) {
  // Key custody, rate limiting and body size all live in the gateway, so
  // nothing below runs until a request has cleared them.
  const gated = await gate(req);
  if (gated instanceof Response) return gated;
  const { body, charge } = gated;

  const requested = (body as { language?: unknown })?.language;
  const language: LanguageCode =
    typeof requested === "string" && requested in LANGUAGE_NAMES
      ? (requested as LanguageCode)
      : "en";

  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return Response.json({ error: "No messages supplied." }, { status: 400 });
  }

  // Trust nothing from the client: roles, shapes and sizes are all re-checked.
  // Walking backwards keeps the newest turns when the character budget runs
  // out, since dropping the question being asked would be the wrong trade.
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  let chars = 0;
  for (const m of raw.slice(-LIMITS.messages).reverse()) {
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const text = content.trim().slice(0, LIMITS.messageChars);
    if (text.length === 0) continue;
    if (chars + text.length > LIMITS.conversationChars) break;
    chars += text.length;
    messages.unshift({ role, content: text });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  // The question is well formed and about to reach the model, so it costs the
  // asker one of their fifteen for the day. The count comes back from the same
  // write, so the counter in the interface is free.
  const left = await charge();

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const usage = emptyUsage();

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
          system: systemFor(language),
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
            // Input and cache counts arrive once per call; output accrues in
            // the deltas. Taking each from one place avoids double counting.
            if (event.type === "message_start") {
              const u = event.message.usage;
              usage.calls += 1;
              usage.input += u.input_tokens ?? 0;
              usage.cacheRead += u.cache_read_input_tokens ?? 0;
              usage.cacheWrite += u.cache_creation_input_tokens ?? 0;
            } else if (event.type === "message_delta") {
              usage.output += event.usage.output_tokens ?? 0;
            }
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
        // "Try again" is the wrong advice for a fault that retrying cannot
        // fix. Billing and credential failures need the operator, not the
        // reader, so say the assistant is unavailable rather than inviting a
        // retry loop, and keep the account details out of a public response.
        const permanent =
          err instanceof Anthropic.AuthenticationError ||
          err instanceof Anthropic.PermissionDeniedError ||
          (err instanceof Anthropic.BadRequestError &&
            /credit balance|billing|quota/i.test(err.message));

        const message = permanent
          ? "\n\n[The assistant is unavailable right now. The rest of the site still works, and the site owner has been alerted in the logs.]"
          : err instanceof Anthropic.RateLimitError
            ? "\n\n[The assistant is busy right now. Try again in a moment.]"
            : "\n\n[The assistant hit an error and stopped. Try again.]";
        controller.enqueue(encoder.encode(message));
      } finally {
        // Logged even when the answer failed part way: a question that cost
        // money and then broke is exactly the one worth seeing in the logs.
        if (usage.calls > 0) logUsage(usage);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Questions-Left": String(left),
    },
  });
}
