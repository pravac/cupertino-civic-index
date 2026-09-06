/**
 * Campaign money facts the assistant states when asked about money flow.
 *
 * Same editorial contract as the election data: every entry is a checkable
 * statement with its sources attached, phrased as exactly what the source
 * supports and no further. The line between "a developer funded a committee
 * this person helped run" and "a developer funds this person" is the entire
 * value of a page like this: the first is a filing, the second is a campaign
 * flyer, and a site that blurs them is writing flyers.
 *
 * `verification` is shown to the assistant and travels with the fact:
 *  - "verified": checked against the filing or an independent record.
 *  - "partly-verified": the committee or event is independently confirmed,
 *    but specific figures or names still trace to a document provided to the
 *    site rather than to the filing itself. Say so when citing.
 *
 * The official records these summarize are public: the City of Cupertino
 * campaign finance dashboard (apps.cupertino.org/campaignfinance) and the
 * filing archive it links (southtechhosting.com/CupertinoCity/
 * CampaignDocsWebRetrieval). Anything here can be checked there by name.
 */

export interface FinanceSource {
  label: string;
  url?: string;
  /** "filing" is the record itself; "coverage" is reporting about it;
   *  "provided-document" is a summary given to this site awaiting a check
   *  against the filing. */
  kind: "filing" | "coverage" | "provided-document";
  confirmedOn?: string;
  /** Anything a reader needs to weigh the source, e.g. that an op-ed's
   *  author was a candidate in the same race. */
  caveat?: string;
}

export interface FinanceFact {
  /** Who or what the fact is about, by name. */
  subject: string;
  cycle: string;
  /** The fact, phrased as exactly what the sources support. This wording is
   *  what the assistant should convey, not a springboard. */
  fact: string;
  verification: "verified" | "partly-verified";
  sources: FinanceSource[];
}

export const FINANCE_FACTS: FinanceFact[] = [
  {
    subject: "Cupertino Getting Things Done Together (2018 committee)",
    cycle: "2018",
    fact:
      "In the 2018 council election, an independent expenditure committee named " +
      '"Cupertino Getting Things Done Together Supporting Vaidhyanathan, Mahoney and Wei 2018" ' +
      "spent in support of those three candidates. Contemporary coverage identified it as a " +
      "vehicle for Vallco developer Sand Hill Property's election spending. A filing summary " +
      "provided to this site lists its principal officers as Rebecca Olsen, Russell Miller, " +
      "Dolly Sandoval and J.R. Fruen, and its funding as $29,000 from the Vallco property " +
      "owner (as of 10/11/2018) plus $31,200 from construction trade union PACs (as of " +
      "10/25/2018). Fruen, now a councilmember seeking re-election in 2026, was an officer " +
      "of the committee, not a recipient: it supported other candidates, and this predates " +
      "his own council service.",
    verification: "partly-verified",
    sources: [
      {
        label:
          "San Jose Inside op-ed, 'Here's How to Fight Corruption in Cupertino' (Nov 2, 2018), naming the committee as Sand Hill independent expenditure spending",
        url: "https://sanjoseinside.com/2018/11/02/op-ed-heres-how-to-fight-corruption-in-cupertino",
        kind: "coverage",
        confirmedOn: "2026-09-06",
        caveat:
          "The author, Tara Sreekrishnan, was herself a candidate in that race; the committee's existence and Sand Hill link are her characterization plus the committee's own name.",
      },
      {
        label:
          "Filing summary provided to this site (officer names and dollar figures); not yet checked against the Form 460/410 in the city's filing archive",
        kind: "provided-document",
      },
    ],
  },
];

/** Where a reader checks any of this, or looks up what this file does not
 *  cover. Both verified reachable on 2026-09-06. */
export const FINANCE_PORTALS = [
  {
    label: "City of Cupertino campaign finance dashboard",
    url: "https://apps.cupertino.org/campaignfinance/searchdata.aspx",
  },
  {
    label: "Cupertino campaign filing archive (search by election, filer, or form)",
    url: "https://www.southtechhosting.com/CupertinoCity/CampaignDocsWebRetrieval/Search/SearchByElection.aspx",
  },
];
