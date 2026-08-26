# Cupertino Civic Index

A single place to find what Cupertino's city government is doing: meetings, agendas,
commissions, the November election, and local news.

Built because this information exists, but is scattered across a records portal, a city
website, a county elections site, and half a dozen news outlets.

## What's live vs. curated

Honesty about data freshness is a core design goal. Every page states its own source.

| Section | Source | Live? |
|---|---|---|
| Meetings, agendas, commissions | [Legistar Web API](https://webapi.legistar.com/Help) | **Yes**, the city's own records system, no key required |
| Local news headlines | Publisher RSS + Google News | **Yes**, refreshed every 30 min |
| Councilmember roster | `src/data/council.ts` | Curated (cupertino.gov blocks automated fetching) |
| Election candidates | `src/data/election.ts` | Curated from public reporting |
| Participation guides | `src/data/guides.ts` | Curated |

Curated files carry a `lastVerified` date. Re-check them after each election and after the
council's annual reorganization, when the Mayor and Vice Mayor rotate.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run typecheck
```

No environment variables and no API keys. Every upstream source is public.

## Design decisions worth knowing

**News sources, in priority order.** San José Spotlight publishes a Cupertino
section feed, so it is fetched first and wins deduplication, giving canonical
publisher links. Everything else arrives through Google News RSS, including a
dedicated Mercury News beat, because Mercury News blocks direct feed access but
is fully indexed by Google.

**Regional stories need a geographic anchor.** Route numbers are not unique:
Highway 17 also runs through the Carolinas and Highway 85 through Colorado, so
a road name alone pulled in crashes two thousand miles away. Transportation
stories must name a road *and* somewhere in the South Bay.

**News is headline-only.** Titles, publishers, dates and outbound links. No article text is
copied or cached, which keeps this a referral index rather than a republisher.

**News is filtered for relevance, not volume.** Cupertino is Apple's mailing address, so a
naive search returns AAPL stock moves and iPhone rumors. `src/lib/news.ts` requires a story
to name Cupertino or a local institution, and rejects corporate-Apple, obituary, sports and
entertainment patterns. Tune the regexes there if the feed drifts.

**Agendas hide procedural noise.** "PLEDGE OF ALLEGIANCE" and participation boilerplate are
separated from substantive items so a resident sees decisions, not ritual.

**Elections are presented neutrally.** Every candidate gets identical fields, priorities are
summarized from their own stated platform, and the site does not endorse. Characterization
belongs in linked coverage, not here.

**Upstream failures degrade gracefully.** Every external call has an 8-second timeout and
returns an empty result with an `unavailable` status rather than throwing. A slow Legistar
never takes a page down.

## Emblems

`public/emblems/` holds the Cupertino city seal and the California state flag,
both from Wikimedia Commons.

One caveat worth raising before any public launch: many municipalities restrict
use of their official seal, and displaying it on an unaffiliated site can imply
endorsement. The footer disclaimer states no affiliation, but if this is pitched
to the city, confirm seal usage with the City Clerk, or swap in a neutral
wordmark until the city formally adopts the project.

## Deploying

Deploys to Vercel with no configuration:

```bash
npx vercel
```

Pages use incremental static regeneration (15 to 60 min), so traffic does not translate into
upstream load on the city's systems.

## Structure

```
src/
  lib/legistar.ts    Legistar client: meetings, agenda items, bodies
  lib/news.ts        RSS aggregation + relevance filtering
  lib/format.ts      Pacific-time date handling
  data/              Curated content with verification dates
  components/        UI primitives, header/footer, cards
  app/               Routes
```

## Adapting this for another city

Legistar is used by hundreds of US cities. To retarget, change the `BASE` client string in
`src/lib/legistar.ts` to your city's Legistar namespace, update `COUNCIL_BODY_ID`, and
replace the files in `src/data/`.

## Disclaimer

Not affiliated with or endorsed by the City of Cupertino. For official notice, records and
legal deadlines, consult the city directly.
