# Cupertino Eye

**Try it: https://cupertinoeye.vercel.app/**

One place to see what Cupertino's city government is doing: meetings, agendas, roll-call votes,
commissions, the council election, local news, and an assistant that answers questions about all
of it in English, Chinese, Hindi and Spanish.

Everything is already public. It is just spread across four systems that do not know about each
other, and the most useful part, how each councilmember voted, lives inside PDFs attached to the
wrong meeting. This site reads those systems and puts the result on one page.

Next.js 16, React 19, TypeScript, Tailwind v4, six runtime dependencies, deployed on Vercel.

---

## How the backend works

### Data comes from the city's live systems, never from hand entry

| Source | What it provides | Code |
| --- | --- | --- |
| Legistar JSON API | Meetings, agendas, bodies, matter search | `src/lib/legistar.ts` |
| Legistar HTML calendar | Cancellations the API misses | `src/lib/legistarCalendar.ts` |
| Minutes PDFs | Roll-call votes | `src/lib/votes.ts` |
| Publisher RSS feeds | Local news, filtered for relevance | `src/lib/news.ts` |
| Committed snapshots | City events, candidate pages, news archive | `src/data/*.json` |

Pages are React server components. Each fetches its sources at request time and caches the result
with incremental static regeneration for 15 to 60 minutes, so traffic on the site does not become
load on the city's servers. Minutes PDFs cache for a day because approved minutes never change.

**Cancellations are reconciled from two sources.** Staff cancel meetings two different ways and
only one reaches the API. The site reads both and treats either as decisive.

**Votes are recovered from PDFs.** Cupertino does not attach minutes to the meeting they describe.
They are attached to the later "Approval of Minutes" agenda item. The vote pipeline searches the
record for those items, follows the attachment, extracts the text with `unpdf`, and parses the
motion prose into named tallies. The parser refuses anything it cannot read with confidence and
passes the verbatim text to the assistant instead, so a garbled tally is quoted rather than
guessed at.

**Snapshots cover what the host cannot reach.** `cupertino.gov` blocks requests from hosting
providers, so city events, candidate materials and the news archive are captured by scripts in
`scripts/` and committed as dated JSON. Two GitHub workflows refresh the events and news captures
daily and ping a Vercel deploy hook so the site picks them up.

### The assistant

`POST /api/chat` is the only route that costs money, so it sits behind a gateway
(`src/lib/apim.ts`) that runs before anything else:

1. The API key is read from the server process and never reaches the browser.
2. Rate limits per caller and in total, plus a daily quota per visitor, are counted in Redis so
   they hold across serverless instances. If Redis is unreachable, in-memory counters take over.
3. Request bodies, message counts and conversation length are capped before parsing.

A request that clears the gate goes to Claude Opus 5 through the SDK's tool runner with 13 typed
tools (`src/lib/chat-tools.ts`): meeting search, agendas, council and commission info, election
and campaign finance data, city events, candidate materials, the voting record, keyword search
over the legislative record, local news, and web search as a last resort. The system prompt and
tool schemas are cached with a single prompt-cache breakpoint, so the several model calls per
question re-send about 4,600 tokens at cache price.

The response is streamed to the client as plain text. Token usage is logged per question. Billing
and credential failures are reported as "the assistant is unavailable" rather than "try again",
because a retry cannot fix them.

### Other routes

- `GET /api/quota` returns how many questions the visitor has left today without spending one.
- `POST /api/community` accepts posts to the community board, checks them with a moderation call,
  and stores them in Redis. Posters get an anonymous cookie identity.
- `POST /api/visit` counts visits in Redis.

---

## How the front end works

Eight pages under `src/app/`, all server-rendered: home, meetings, a meeting detail page, council,
election, news, community, participate, and the assistant. Navigation and footer live in
`src/components/Chrome.tsx`. Styling is Tailwind v4 over one set of CSS custom properties, so
light and dark mode share a single token set and there is no component library.

Only three components run in the browser:

- **`Chat.tsx`** asks `/api/quota` on mount, sends the last 20 turns plus the chosen language to
  `/api/chat`, and reads the response with a stream reader, rewriting the trailing assistant
  message as tokens arrive. The remaining-questions count comes back in a response header. A
  language picker offers English, Traditional Chinese, Simplified Chinese, Hindi and Spanish.
- **`CommunityBoard.tsx`** posts to the board and shows the moderated result.
- **`VisitCount.tsx`** displays the counter.

Assistant output is rendered by `Markdown.tsx`, about 60 hand-written lines that build React
elements directly for paragraphs, bullets, bold and links. Nothing is injected as HTML, and links
with a scheme other than http or https are dropped, which matters when the text is
model-generated.

Official text is never machine-translated. Agenda titles, motions and headlines stay in their
original words with names and file numbers intact; the assistant translates alongside them. The
hand-maintained roster and candidate list carry a `lastVerified` date that is shown in the UI.

---

## Running it

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the assistant
npm run dev
```

Every page except the assistant works without a key, because every upstream source is public.
Without one, `/assistant` returns a 503 and the rest of the site is unaffected. Redis is optional
too: the assistant falls back to in-memory limits and the community board disables itself.

```bash
npm run build
npm run typecheck
npm run lint
npm run snapshot:events        # refresh the city events capture
npm run snapshot:news          # refresh the news archive
npm run propose:candidates     # find candidate pages for a new election cycle
npm run snapshot:candidates    # capture confirmed candidate pages
```

## Refreshing the election

Add the next cycle to `ELECTION_CYCLES` in `src/data/election.ts`, run `propose:candidates`, then
confirm each proposed URL by hand before pasting it into the config. That step is manual on
purpose: the first real run found a campaign domain from a prior cycle that would have attributed
a four-year-old platform to a current candidate. Finally run `snapshot:candidates` and commit the
snapshot. A candidate with no confirmed page is shown as such rather than papered over.

## Adapting this for another city

Legistar is used by hundreds of US cities. Change the namespace in `src/lib/legistar.ts`, update
`COUNCIL_BODY_ID`, and replace the files in `src/data/`. The reconciliation logic, the vote parser
and the assistant tooling are not Cupertino-specific.

---

For official notice, records and legal
deadlines, consult the city directly.
