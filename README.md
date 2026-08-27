# Cupertino Civic Index

A single place to find what Cupertino's city government is actually doing: meetings, agendas,
roll-call votes, commissions, the November election, and local news.

**Live: https://cupertino-civic.vercel.app**

Built because all of this information is already public, already online, and effectively
unreachable by the people it is published for.

---

## Why

Cupertino publishes well. Every meeting, agenda, motion and vote is a public record and most of
it is genuinely online. The problem is not availability. It is that the record lives in four
systems that do not know about each other, and the single most useful part of it, how each
councilmember voted, lives in the least reachable one.

Answering "what is the housing project near me, and who voted for it" currently means: search a
records portal for the matter, note the meeting dates, open each meeting, find the *later*
meeting that approved the minutes, open the PDF attached to *that* agenda item, and read the
motion. Six steps across three systems, and you have to already understand the process to know
the steps exist.

Some numbers that motivated specific features, each measured against the live systems:

| Measured | Result |
| --- | --- |
| Boilerplate share of agenda text, 20 agendas sampled | median **88%** (range 65 to 91) |
| Meetings with a machine-readable minutes file, 1,000 sampled | **0** |
| Agenda items recording a structured action, on a 40-item agenda | **0** |
| Cancellations on the current calendar reported by the API | **2 of 4** |

That last row is the one that made this feel worth building. Staff cancel a meeting two different
ways, and only one reaches the API. Software trusting it would tell a resident that a canceled
meeting was still happening.

---

## What it does

- **One calendar** across the council and all 21 commissions, past and upcoming, with agendas.
- **Cancellations that are actually correct**, reconciled from two sources that disagree.
- **Agendas with the boilerplate removed.** A 19-row agenda becomes 6 items of real business.
- **Keyword search across the legislative record.** "Mary Avenue" returns the full paper trail
  including the closed sessions on litigation.
- **Roll-call votes**, recovered from minutes PDFs, with every member named and the source linked.
- **A grounded assistant** that answers questions in English, Traditional and Simplified Chinese,
  Hindi and Spanish, using the same live sources as the pages.

---

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router), React 19, **TypeScript** strict | Server components keep third-party fetches server-side; ISR caches upstream calls so traffic does not translate into load on the city's systems. |
| Styling | **Tailwind v4** with CSS custom properties | One token set drives light and dark; no component library. |
| LLM | **Claude Opus 5** via `@anthropic-ai/sdk` tool runner | Nine typed tools, streamed to the client over a `ReadableStream`. |
| PDF | **unpdf** (pdf.js) | Text extraction, not OCR. The minutes carry real embedded text; OCR would introduce character errors into names. |
| Hosting | **Vercel** | One environment variable. |

**Five runtime dependencies total.** No state library, no markdown library, no UI kit, no ORM.
The markdown renderer for assistant output is ~60 hand-written lines because it builds React
elements directly and never injects HTML, which matters when the text is model-generated.

```
src/
  lib/legistar.ts          Meetings, agendas, bodies, matter search
  lib/legistarCalendar.ts  HTML calendar reconciliation (cancellations)
  lib/votes.ts             Minutes discovery, PDF extraction, roll-call parsing
  lib/news.ts              Publisher feeds + relevance filtering
  lib/chat-tools.ts        The 9 tools the assistant can call
  app/api/chat/route.ts    Streaming endpoint, validation, rate limiting
```

Roughly 4,100 lines across 30 files, 8 pages, 1 API route.

---

## Architecture: derived, never retyped

Everything on the site is derived from the city's live systems at request time and cached. Nothing
is transcribed by hand, because hand-transcribed civic data is wrong the moment a council seat
changes and nobody notices.

```
Legistar JSON API ─┐
Legistar HTML      ├─→ reconcile → cache (ISR) → pages
Minutes PDFs       │                          └─→ tools → assistant
Publisher RSS     ─┘
```

The only hand-maintained data is the councilmember roster and candidate list, because
`cupertino.gov` returns 403 to automated requests. Those files carry a `lastVerified` date that is
rendered in the UI, so staleness is visible rather than assumed.

---

## What was hard

### The API is missing the most important data, and does not say so

The Legistar API is clean and well-documented, which made it easy to trust. It also returns an
empty array for votes, no minutes file on any of 1,000 sampled meetings, and no recorded action on
any item of a 40-item agenda. Notably `/votetypes` *does* return data, so the platform supports
votes; this city just never populates them.

Cancellations were the sharpest version. The API reported two of four. The other two were recorded
by swapping the agenda document for a cancellation notice, visible only in the HTML calendar. The
site now reads both and treats either as decisive. Discovering this required diffing what a human
sees against what the API returns, which is not a habit you have until an absence bites you.

### The votes were reachable, just not from where you would look

Minutes are not attached to the meeting they describe. They are attachments on the *later* agenda
item that approves them. So nothing starting from a meeting ever finds its own minutes. Once found,
the path is: search matters for minutes items, follow to the attachment, fetch the PDF, extract
text, parse the motion prose.

### Two parser bugs, one of which would have published false statements about named people

Reading roll calls out of prose is the one part of this that fails dangerously rather than
gracefully. A bad parse publishes that a named councilmember voted a way they did not, in five
languages, on a page that looks authoritative.

Testing against deliberately awkward inputs found this:

```
Input:  Ayes: Moore, Chao, J.R. Fruen, R. Wang. Noes: None.
Output: ["Moore", "Chao"]        // motion reported as carried
```

Capturing ran to the first period, and `J.R.` contains two. A 4-0 vote would have published as 2-0
with nothing indicating anything was missing.

Fixing it exposed a second bug underneath. The corrected pattern used a negative lookbehind to
distinguish an initial from a sentence end, but the regex carried the `i` flag, and **under `i` the
class `[A-Z]` also matches lowercase**. The lookbehind rejected every letter and never fired, so
each motion's final tally ran on into the next paragraph. That silently swung the failure the other
way: 16 of 18 real motions refused. A guard that rejects valid data is as useless as one that
invents it.

### Deciding where determinism ends and the model begins

Once parsing was strict, it refused anything unfamiliar, which is safe but unhelpful. A regular
expression only matches shapes someone anticipated, and clerks write shapes nobody anticipated. One
real motion had a page header spliced into the tally by PDF extraction:

```
Ayes: Moore, Chao, City Council Minutes July 21, 2026 Page 4 and Wang.
```

The parser was right to refuse; that is not a name. The resolution was not more regex. Unparsed
motions now hand their **verbatim text** to the model, which must quote the sentence it read the
vote from and may never name a member absent from that text. Given the raw prose it reads the vote
correctly as 3 to 2, elides the page header rather than treating it as a councilmember, and picks
up something no structured field could hold: the motion failed *despite* a majority because it
required two thirds.

The safeguard was never "do not read." It is "do not paraphrase," because a quoted source is
checkable and a summary is not. Deterministic parsing handles the common shape, where it is cheap
and structurally cannot invent a name. The model handles the tail.

### Being general is not the same as being useful

The vote lookup read the four most recent minutes documents. Nothing in it was hardcoded to any
project, but a question about anything heard earlier returned "no votes on record" for a vote that
existed, which is worse than a partial answer. Two follow-on gaps had the same shape: matching was
literal, so "sheriff" missed minutes that say "law enforcement contract"; and there was no way to
ask about a specific meeting date, so a question naming one forced a guess at a topic. Each looked
like an absence of data and was actually an absence of a code path.

### The last mile was where the real defects were

The vote extraction was correct for a while before it was usable. Assistant output rendered as raw
text, so `**bold**` showed literally and, worse, every citation link was inert. The point of citing
minutes is that someone can open them. Answers also ran to 1,400 characters of headers and bulleted
motion lists, which hands the reader the raw material and makes them do the work they asked you to
do. Now around 700 characters of prose, one link, and an offer to go deeper.

Both were found by reading actual output, not by testing code.

---

## Product decisions

The constraints are the part that makes this adoptable rather than a liability.

- **It will not guess at a vote.** Unreadable tallies say so and link the document. An unread vote
  is a gap; a wrong vote is a defect, and the two are not interchangeable.
- **It will not machine-translate the official record.** Agenda titles, motions and headlines stay
  in their original words with names and file numbers intact; the assistant translates alongside
  rather than replacing. Someone reading in Spanish learns to ask for a "speaker card" by that name,
  because that is what they will need at the counter.
- **It will not endorse.** All eight council candidates are described on identical terms, with no
  recommendation and no prediction. It also notes that only some candidates hold city seats, so a
  voting record exists for some and not others, and presenting that as like-for-like would mislead.
- **It will not state a URL, phone number or address that did not come from a source.** It once
  produced plausible county contact details from model memory; that is now forbidden.
- **It will not work around `cupertino.gov`'s bot protection.** Building a tool for a city on top of
  evading that city's access controls is not a foundation worth having, and the content turned out
  to be reachable another way regardless.

---

## Running it

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the assistant
npm run dev
```

One environment variable, and only the assistant needs it. Every other page works without a key,
because every upstream source is public and unauthenticated. Without it, `/assistant` returns a 503
explaining it is unconfigured and the rest of the site is unaffected.

```bash
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint
```

---

## Deployment

Deployed on Vercel at **https://cupertino-civic.vercel.app**. `ANTHROPIC_API_KEY` is set as a
sensitive environment variable on production and preview. Pages use incremental static
regeneration (15 to 60 minutes) so traffic does not translate into load on the city's systems, and
minutes PDFs cache for a day since approved minutes are immutable.

---

## Known limits

Stated here rather than discovered later.

- **Votes lag by design.** Minutes are adopted at a later meeting, so recent votes do not exist
  yet. The assistant says this instead of implying full coverage.
- **A third cancellation convention would slip through.** Two are handled; the site cannot detect a
  convention nobody has used yet. The pattern that produced this bug, one office recording the same
  fact two ways, is the pattern that produces a third way later.
- **Rate limiting is in-process.** It bounds one instance, not a distributed abuser. A public launch
  needs a shared store or auth in front of it.
- **The roster is hand-maintained** and dated in the UI. It needs re-verification after each
  election and each annual mayor rotation.

---

## Adapting this for another city

Legistar is used by hundreds of US cities. Change the namespace in `src/lib/legistar.ts`, update
`COUNCIL_BODY_ID`, and replace the files in `src/data/`. The reconciliation logic, the vote parser
and the assistant tooling are not Cupertino-specific.

---

Not affiliated with or endorsed by the City of Cupertino. For official notice, records and legal
deadlines, consult the city directly.
