/**
 * November 3, 2026 general election — three of five council seats.
 *
 * Editorial standard: every candidate gets the same fields, priorities are
 * summarized from their own stated platform, and nothing here characterizes a
 * candidate positively or negatively. Anything beyond that belongs in the
 * linked coverage, not in a city-facing resource.
 */
export interface Candidate {
  name: string;
  background: string;
  slate: string | null;
  incumbent: boolean;
  priorities: string[];
}

export const ELECTION = {
  date: "2026-11-03",
  label: "General Election",
  seats: 3,
  office: "Cupertino City Council",
  registrarUrl: "https://vote.santaclaracounty.gov/city-cupertino",
  coverageUrl: "https://sanjosespotlight.com/eight-candidates-compete-for-cupertino-council-seats/",
  lastVerified: "2026-08-25",
};

/** The defining policy split in this cycle, stated neutrally. */
export const ELECTION_CONTEXT =
  "Candidates divide largely over how Cupertino should meet state-mandated housing targets — how much new housing to approve, and where. Two informal slates have formed around that question.";

export const CANDIDATES: Candidate[] = [
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
  },
  {
    name: "Tracy Kosolcharoen",
    background: "Chair, Cupertino Planning Commission",
    slate: "Slow-growth group",
    incumbent: false,
    priorities: [
      "Preserve neighborhood quality of life",
      "Protect local retail businesses",
      "Responsible spending of tax dollars",
    ],
  },
  {
    name: "Gopal Kumarappan",
    background: "Technology executive; chair, Parks and Recreation Commission",
    slate: "Slow-growth group",
    incumbent: false,
    priorities: [
      "Balanced growth",
      "Youth civic engagement",
      "Community education on development",
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
  },
  {
    name: "Santosh Rao",
    background: "Technology executive; chaired the Planning Commission in 2025",
    slate: "Slow-growth group",
    incumbent: false,
    priorities: [
      "Government efficiency",
      "Taxpayer accountability",
      "Reduce regulations on small business",
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
  },
  {
    name: "J.Z. Wang",
    background: "Engineer and businesswoman",
    slate: null,
    incumbent: false,
    priorities: ["Improve public trust in city government", "Strengthen how the city listens to residents"],
  },
];
