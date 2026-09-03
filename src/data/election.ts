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

/**
 * An order for the candidate cards other than the file's own alphabetical one.
 *
 * Pinning is deliberately awkward to use: naming candidates puts the site's
 * authority behind putting them first, which is exactly the kind of
 * characterization the rest of this file refuses to make by accident. So the
 * reason travels with the names, it is required, and the page prints it above
 * the cards. A reader who disagrees with the order can see what it claims and
 * check it. An editor who cannot finish the sentence "these are first
 * because..." has their answer: leave `featured` off and the list stays
 * alphabetical.
 */
export interface FeaturedOrder {
  /** Candidate names, exactly as spelled in `candidates`, in the order they
   *  should appear. Everyone else keeps the file's order behind them. A name
   *  that matches no candidate is a build error, not a silent no-op. */
  names: string[];
  /** Why they are first, in the words the page shows the reader. If it is a
   *  checkable fact, name it ("Incumbents seeking re-election, first."). If it
   *  is the site's own judgment about who the race has centered on, say that
   *  too, in the same sentence. What this field must never do is dress a
   *  judgment up as a measurement, which is the one version a reader cannot
   *  argue with. */
  basis: string;
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
  /** Optional. Omit it and the cards run in this file's order, which is
   *  alphabetical by surname. */
  featured?: FeaturedOrder;
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
    // The six pillars his site names, in his own headings and his own order.
    // Picking three of them would be us deciding which of a candidate's
    // priorities count.
    priorities: [
      "Quality of life",
      "Fiscal discipline",
      "Sensible development",
      "Pro-business",
      "Education and schools",
      "Public safety",
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
    featured: {
      names: ["J.R. Fruen", "Santosh Rao"],
      basis:
        "The two candidates this race has centered on come first, then everyone else alphabetically. " +
        "That order is this site's judgment, not a measured result.",
    },
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

/**
 * The cycle's candidates in the order the cards should appear: pinned names
 * first, in the order `featured.names` lists them, then everyone else in this
 * file's order. The sort compares only the pinned rank, and `Array#sort` is
 * stable, so the unpinned tail keeps its alphabetical order rather than being
 * re-sorted into first-name order.
 */
export function orderedCandidates(cycle: ElectionCycle): Candidate[] {
  const pinned = cycle.featured?.names ?? [];
  const unknown = pinned.filter((n) => !cycle.candidates.some((c) => c.name === n));
  if (unknown.length > 0) {
    throw new Error(
      `Election ${cycle.date}: featured.names has no candidate called ${unknown.join(", ")}. ` +
        `Candidates in this cycle: ${cycle.candidates.map((c) => c.name).join(", ")}.`,
    );
  }
  const rank = (c: Candidate) => {
    const i = pinned.indexOf(c.name);
    return i === -1 ? pinned.length : i;
  };
  return [...cycle.candidates].sort((a, b) => rank(a) - rank(b));
}

export const ELECTION = currentCycle();
/** Source order: alphabetical by surname. What every non-display consumer
 *  should use, so a display choice never reads as a ranking in the chat
 *  answers or anywhere else. */
export const CANDIDATES = ELECTION.candidates;
/** Display order for the election page's cards. */
export const CANDIDATES_ORDERED = orderedCandidates(ELECTION);
export const ELECTION_CONTEXT = ELECTION.context;
