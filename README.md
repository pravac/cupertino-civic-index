# Care for Cupertino

A single place to find what Cupertino's city government is actually doing: meetings, agendas,
roll-call votes, commissions, the November election, and local news.

**Live: https://cupertino-civic.vercel.app**

Built because all of this information is already public, already online, and effectively
unreachable by the people it is published for.

**What it demonstrates:** a full-stack product shipped end to end, from problem definition through
architecture, implementation and launch. Reconciles four upstream systems that disagree with each
other, recovers data nobody else surfaces, and layers an LLM agent over it with a designed failure
model. Next.js 16, React 19, TypeScript, five runtime dependencies, deployed and live.

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

## Engineering highlights

### Reconciling four systems that contradict each other

The official API is clean and well documented, which makes it easy to trust and dangerous to trust
blindly. I audited it against what a human actually sees and found systematic omissions: an empty
array for votes, no minutes file on any of 1,000 sampled meetings, no recorded action on any item
of a 40-item agenda. (`/votetypes` *does* return data, so the platform supports votes; this city
never populates them.)

Cancellations were the highest-stakes case. The API reported two of four. The other two were
recorded by swapping the agenda document for a cancellation notice, visible only in the HTML
calendar. Software trusting the API alone would have told a resident that a canceled meeting was
still happening. The site reads both sources and treats either as decisive, so all four are
correct.

**The transferable habit:** verify an upstream contract against ground truth before building on it,
especially when it looks authoritative.

### Recovering roll-call votes that nothing else surfaces

Who voted for what is the single most consequential thing a city publishes and the least reachable.
It exists only as prose inside minutes PDFs, and those PDFs are attached to the *later* agenda item
that approves them, never to the meeting they describe. Nothing starting from a meeting ever finds
its own minutes, which is why no other tool surfaces this.

I traced and automated the full path: search the legislative record for minutes items, follow to the
attachment, fetch the PDF, extract text, parse the motion prose into named tallies. The site now
answers "who voted against this" with every member named and the source document linked, from a
record that is otherwise effectively private.

### Designing a parser that refuses rather than guesses

This is the one component whose failure mode is genuinely dangerous rather than merely degraded: a
bad parse would publish that a named councilmember voted a way they did not, in five languages, on
a page that looks authoritative. So I treated it as a correctness problem with a stated failure
model rather than a text-munging problem, and built an adversarial test suite for it before launch.

That suite earned its keep immediately. It caught a silent data-corruption class:

```
Input:  Ayes: Moore, Chao, J.R. Fruen, R. Wang. Noes: None.
Output: ["Moore", "Chao"]        // motion reported as carried
```

Capture ran to the first period and `J.R.` contains two, so a 4-0 vote would have published as 2-0
with no indication anything was missing. Exactly the class of defect that is invisible in review and
indefensible in production.

The fix used a negative lookbehind to distinguish an initial from a sentence end, which surfaced a
genuinely subtle second issue: the pattern carried the `i` flag, and **under `i` the class `[A-Z]`
also matches lowercase**. The lookbehind rejected every letter and never fired. Regression testing
against real minutes caught it in the opposite direction, refusing 16 of 18 valid motions, which
led to the principle the component is now built on: *a guard that rejects valid data is as useless
as one that invents it.* Both directions are failures, and both need tests.

Final state, verified against real minutes and adversarial fixtures: initials, trailing prose,
recusals, split votes and amended-then-substitute motions all parse correctly; a genuinely garbled
tally is refused and flagged rather than guessed at.

### A hybrid extraction architecture: deterministic head, model tail

Strict parsing is safe but incomplete: a regular expression only matches shapes someone anticipated,
and clerks write shapes nobody anticipated. Rather than chase coverage with more patterns, I split
the work by what each tool is actually good at. One real motion had a page header spliced into the
tally by PDF extraction:

```
Ayes: Moore, Chao, City Council Minutes July 21, 2026 Page 4 and Wang.
```

The parser is right to refuse; that is not a name. Unparsed motions hand their **verbatim text** to
the model under enforced constraints: quote the sentence the vote was read from, never name a member
absent from that text, say so plainly when the text does not record a vote. Given the raw prose the
model reads it correctly as 3 to 2, elides the page header rather than treating it as a
councilmember, and surfaces something no structured field could hold: the motion failed *despite* a
majority because it required two thirds.

The design principle: the safeguard is not "do not read," it is **"do not paraphrase,"** because a
quoted source is checkable and a summary is not. Determinism covers the common shape, where it is
cheap and structurally cannot invent a name. The model covers the tail, where flexibility is worth
more than speed. Verification is mandatory on both paths.

### Designing for how people actually ask

Residents ask about the thing outside their window, not about the meeting it appeared on. Three
retrieval paths came out of watching real questions fail, each of which had looked like missing data
and was actually a missing code path:

- **Topic search over the whole record**, because date-ordered browsing assumes you already know the
  answer. "Mary Avenue" now returns the full paper trail, including closed sessions on litigation.
- **Synonym resilience**, because minutes say "law enforcement contract" and people say "sheriff."
  A miss now retries with the city's own vocabulary instead of reporting no vote.
- **Lookup by meeting date**, because "what happened on July 21" should not require guessing a
  keyword.

Each was validated by re-running the question that exposed it until it resolved consistently rather
than intermittently.

### Last-mile product polish

Correct is not the same as usable, and the gap only shows when you read real output rather than
test results.

Assistant responses were rendering as raw text, so citation links were inert. The entire point of
citing the minutes is that someone can open them. I wrote a ~60 line markdown renderer that builds
React elements directly and never injects HTML, so a link in model-generated output cannot become
markup and non-http schemes are dropped.

Answers also ran to ~1,400 characters of headers and bulleted motion lists, which hands the reader
the raw material and makes them do the work they asked you to do. Tuned to **~700 characters** of
prose, one citation, and an offer to go deeper. Detail is one question away instead of dumped
up front.

---

## Product judgment: the constraints are the feature

A civic tool is adopted or rejected on trust, not capability. These constraints are deliberate, and
they are what would let a city put its name near this.

- **It will not guess at a vote.** Unreadable tallies say so and link the document. An unread vote
  is a gap; a wrong vote is a defect, and the two are not interchangeable.
- **It will not machine-translate the official record.** Agenda titles, motions and headlines stay
  in their original words with names and file numbers intact; the assistant translates alongside
  rather than replacing. Someone reading in Spanish learns to ask for a "speaker card" by that name,
  because that is what they will need at the counter.
- **It will not endorse.** All eight council candidates are described on identical terms, with no
  recommendation and no prediction. It also notes that only some candidates hold city seats, so a
  voting record exists for some and not others, and presenting that as like-for-like would mislead.
- **It will not state a URL, phone number or address that did not come from a source.** Every
  contact detail is traceable to a tool result. A confident wrong link is worse than no link,
  particularly when the reader is trying to reach a government office.
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

## Operating envelope

Documented deliberately, because a system whose boundaries are known is one you can trust inside
them. Each of these is a scoping decision with a stated path forward, not an unknown.

| Boundary | Why it exists | How it is handled |
| --- | --- | --- |
| Votes lag the meeting | Minutes are adopted at a *later* meeting, so recent votes genuinely do not exist yet | The assistant states the coverage window instead of implying completeness |
| Two cancellation conventions handled | A third convention nobody has used yet is undetectable by definition | Either known source is treated as decisive, so coverage degrades safely rather than silently |
| In-process rate limiting | Bounds one instance, appropriate for current scale | Documented as the first thing to move to a shared store ahead of a public launch |
| Roster maintained by hand | `cupertino.gov` returns 403 to automated requests | Carries a `lastVerified` date rendered in the UI, so staleness is visible rather than assumed |

---

## Data freshness

Meetings, agendas, roll-call votes, commissions, matter search and news are
read from their sources on request and cached briefly, so the site reflects
what the city published minutes ago. Nothing there is transcribed or stored.

City events are the one exception. `cupertino.gov` refuses requests from
hosting providers, so the deploy host cannot fetch them and a dated capture is
committed instead, refreshed daily by `.github/workflows/refresh-events.yml`.
Runners use datacenter addresses too, so whether that job can reach the site is
an open question its first runs will answer; if it reports the fetch was
blocked, run `npm run snapshot:events` from an ordinary connection. The capture
script refuses to overwrite itself unless the fetch was genuinely live, so a
blocked run cannot replace real data with nothing.

Because deploys are not wired to Git, the workflow also pings a Vercel deploy
hook so a refreshed capture actually reaches the site. Set
`VERCEL_DEPLOY_HOOK` as a repository secret; without it the workflow still
commits and simply skips the deploy step.

## Adapting this for another city

Legistar is used by hundreds of US cities. Change the namespace in `src/lib/legistar.ts`, update
`COUNCIL_BODY_ID`, and replace the files in `src/data/`. The reconciliation logic, the vote parser
and the assistant tooling are not Cupertino-specific.

---

Not affiliated with or endorsed by the City of Cupertino. For official notice, records and legal
deadlines, consult the city directly.
