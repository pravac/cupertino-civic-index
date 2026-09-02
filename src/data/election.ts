/**
 * November 3, 2026 general election for three of five council seats.
 *
 * Editorial standard: every candidate gets the same fields, priorities are
 * summarized from their own stated platform, and nothing here characterizes a
 * candidate positively or negatively. Anything beyond that belongs in the
 * linked coverage, not in a city-facing resource.
 *
 * Slates are self-declared only. A slate appears here when the candidates
 * themselves declared one and named it; groupings that only an outside
 * observer has drawn do not appear, however widely they are repeated. This
 * page previously carried "Slow-growth group" on three cards, which was a
 * press description rather than anything those candidates called themselves,
 * while the other three carried the name their own slate chose. Labeling one
 * group by its self-description and another by an outsider's is not a small
 * inconsistency in an election guide: it hands the reader a characterization
 * and the site's authority behind it. Requiring self-declaration is symmetric,
 * checkable, and needs no judgment call from whoever edits this file next.
 */
export interface CandidateSource {
  /** A page the candidate publishes or filed themselves. */
  url: string;
  /** What it is, in the words a reader needs: "Campaign website". */
  label: string;
  /** The date a person checked this page really belongs to this candidate.
   *  Never auto-discovered. A search result that looks right is not the same
   *  as a confirmed one, and attaching the wrong site to a candidate's name is
   *  the worst mistake this file can make. */
  confirmedOn: string;
}

export interface Candidate {
  name: string;
  background: string;
  /** The slate's own name, where the candidates declared one. Never a
   *  grouping assigned from outside. */
  slate: string | null;
  incumbent: boolean;
  priorities: string[];
  /** Where a reader can check any of this in the candidate's own words. An
   *  empty list is honest and visible: the page says the link is missing
   *  rather than implying the summary came from somewhere. */
  sources: CandidateSource[];
}

export interface ElectionCycle {
  date: string;
  label: string;
  seats: number;
  office: string;
  registrarUrl: string;
  coverageUrl: string;
  lastVerified: string;
  /** The policy question the cycle turns on, describing the question rather
   *  than the people answering it. */
  context: string;
  candidates: Candidate[];
}



const CANDIDATES_2026: Candidate[] = [
  {
    name: "Mark Fantozzi",
    background: "Structural civil engineer",
    slate: null,
    incumbent: false,
    priorities: [
      "Streamline city government",
      "Increase transparency in municipal spending",
      "Oppose high-density housing in wildfire zones",
    ],
    sources: [],
  },
  {
    name: "J.R. Fruen",
    background: "Attorney; chief of staff to a San Jose councilmember",
    slate: "Cupertino Together",
    incumbent: true,
    priorities: [
      "Housing affordability and production",
      "Compromise across policy disagreements",
    ],
    sources: [],
  },
  {
    name: "Tracy Kosolcharoen",
    background: "Chair, Cupertino Planning Commission",
    slate: null,
    incumbent: false,
    priorities: [
      "Preserve neighborhood quality of life",
      "Protect local retail businesses",
      "Responsible spending of tax dollars",
    ],
    sources: [
      { url: "https://votetracyk.com/", label: "Campaign website", confirmedOn: "2026-08-31" },
    ],
  },
  {
    name: "Gopal Kumarappan",
    background: "Technology executive; chair, Parks and Recreation Commission",
    slate: null,
    incumbent: false,
    priorities: [
      "Balanced growth",
      "Youth civic engagement",
      "Community education on development",
    ],
    sources: [
      { url: "https://www.gopal4cupertino.org/", label: "Campaign website", confirmedOn: "2026-08-31" },
    ],
  },
  {
    name: "Seema Sharma Lindskog",
    background: "Planning Commissioner; chair, Walk Bike Cupertino",
    slate: "Cupertino Together",
    incumbent: false,
    priorities: [
      "Develop retail clusters",
      "Diversify city tax revenue",
      "Safer streets and trails",
    ],
    sources: [],
  },
  {
    name: "Santosh Rao",
    background: "Technology executive; chaired the Planning Commission in 2025",
    slate: null,
    incumbent: false,
    priorities: [
      "Government efficiency",
      "Taxpayer accountability",
      "Reduce regulations on small business",
    ],
    sources: [
      { url: "https://rao4residents.org/", label: "Campaign website", confirmedOn: "2026-08-31" },
    ],
  },
  {
    name: "John Tang",
    background: "Deputy director of water resources for San Jose; civil engineer and lecturer",
    slate: "Cupertino Together",
    incumbent: false,
    priorities: [
      "Smarter housing choices",
      "Reduce city staff turnover",
      "Redevelop Vallco as a mixed-use destination",
    ],
    sources: [],
  },
  {
    name: "J.Z. Wang",
    background: "Engineer and businesswoman",
    slate: null,
    incumbent: false,
    priorities: ["Improve public trust in city government", "Strengthen how the city listens to residents"],
    sources: [],
  },
];

/**
 * Every cycle the site has covered, newest last. Adding November 2028 is a
 * data edit here plus a run of `npm run snapshot:candidates`, not a code
 * change anywhere else.
 */
export const ELECTION_CYCLES: ElectionCycle[] = [
  {
  date: "2026-11-03",
  label: "General Election",
  seats: 3,
  office: "Cupertino City Council",
  registrarUrl: "https://vote.santaclaracounty.gov/city-cupertino",
  coverageUrl: "https://sanjosespotlight.com/eight-candidates-compete-for-cupertino-council-seats/",
  lastVerified: "2026-08-25",
    context:
      "Candidates divide largely over how Cupertino should meet state-mandated housing targets: how much new housing to approve, and where. Read each candidate's stated priorities below and their own campaign materials before deciding where any of them stands.",
    candidates: CANDIDATES_2026,
  },
];

/** The cycle the site is currently about: the next one still to happen, or the
 *  most recent if none is upcoming, so the page never goes blank between
 *  elections. */
function currentCycle(): ElectionCycle {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...ELECTION_CYCLES].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((c) => c.date >= today) ?? sorted[sorted.length - 1];
}

export const ELECTION = currentCycle();
export const CANDIDATES = ELECTION.candidates;
export const ELECTION_CONTEXT = ELECTION.context;
