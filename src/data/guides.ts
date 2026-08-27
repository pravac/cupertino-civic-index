/**
 * Participation guides. These answer the questions that actually stop people
 * from engaging. Not "what is a city council" but "how do I say something and
 * have it count."
 *
 * Every guide links out to the authoritative city page. Where a detail varies
 * by meeting (time limits especially), the wording says so rather than stating
 * a number the city might change.
 */
export interface Guide {
  slug: string;
  title: string;
  summary: string;
  steps: string[];
  officialUrl: string;
  officialLabel: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "public-comment",
    title: "Speak at a council meeting",
    summary:
      "Any resident can address the council on any agenda item, or on any city topic during oral communications. You do not need to sign up in advance to attend.",
    steps: [
      "Find the meeting and read the agenda. Comment is taken item by item, so note which item you care about.",
      "Attend in person at Community Hall, 10350 Torre Avenue, or join the teleconference link published on the agenda.",
      "Fill out a speaker card before your item is called, or use the raise-hand function if attending remotely.",
      "Speak when called. Time limits are set by the chair and are commonly around three minutes; the agenda states the limit for that meeting.",
      "If you would rather not speak, written comments emailed before the meeting become part of the public record.",
    ],
    officialUrl: "https://www.cupertino.gov/Your-City/City-Council",
    officialLabel: "City Council page",
  },
  {
    slug: "contact-council",
    title: "Contact your councilmembers",
    summary:
      "Email sent to the full council becomes part of the public record and is distributed to all five members plus staff.",
    steps: [
      "Email the full council at citycouncil@cupertino.gov to reach all five members at once.",
      "Put the agenda item number in the subject line if your message concerns an upcoming decision.",
      "Send it before the agenda packet closes. Messages that arrive early are more likely to be read before the vote.",
      "Expect your name and message to appear in the public record and written communications packet.",
    ],
    officialUrl: "https://www.cupertino.gov/Your-City/City-Council",
    officialLabel: "Councilmember contacts",
  },
  {
    slug: "join-commission",
    title: "Join a commission",
    summary:
      "Commissions advise the council on planning, parks, housing, libraries, public safety, sustainability and the arts. Members are residents appointed by the council, and seats open regularly.",
    steps: [
      "Browse the commissions below to find one matching what you care about.",
      "Check the city's vacancy page. Recruitments open on a set cycle, usually in the winter, plus mid-term vacancies.",
      "Submit an application by the posted deadline.",
      "Interview with the council at a public meeting; appointments are made by council vote.",
      "If you are under 18, the Teen Commission is specifically for Cupertino students.",
    ],
    officialUrl: "https://www.cupertino.gov/Your-City/Commissions-and-Committees/Commission-Vacancies",
    officialLabel: "Commission vacancies",
  },
  {
    slug: "events",
    title: "Find city events and things happening in the parks",
    summary:
      "Cupertino runs festivals, summer concerts, movie nights and fitness classes, mostly at Memorial Park. The city does not publish this as a machine-readable calendar, so the official pages are the authoritative source and this site can only point at them.",
    steps: [
      "The Parks and Recreation event calendar is the authoritative listing for concerts, movie nights, and classes.",
      "Large annual festivals such as the Cherry Blossom Festival, Diwali, and the Big Bunny 5K have their own festival information page.",
      "Recreation classes and camps are published as a seasonal schedule rather than as individual calendar entries.",
      "City-sponsored events are approved by the council, so an event's approval and its funding appear in the legislative record even when the event itself does not.",
    ],
    officialUrl: "https://www.cupertino.gov/Parks-Recreation/Events",
    officialLabel: "Parks and Recreation events",
  },
  {
    slug: "watch",
    title: "Watch or catch up on a meeting",
    summary:
      "Every regular meeting is public, streamed, and archived. You can read what was decided without watching hours of video.",
    steps: [
      "Upcoming meetings and their agendas are listed on this site as soon as the city publishes them.",
      "Agendas post in advance of the meeting; minutes and video are attached afterward.",
      "Open any meeting here to read its agenda item by item, with procedural items filtered out.",
      "Use the Legistar link on a meeting for official packets, attachments and full video.",
    ],
    officialUrl: "https://cupertino.legistar.com/Calendar.aspx",
    officialLabel: "Official meeting portal",
  },
];

/** One-line explanations for the bodies Legistar returns. Anything without an
 *  entry still renders and simply shows without a description. */
export const BODY_DESCRIPTIONS: Record<string, string> = {
  "City Council": "The city's elected governing body. Sets policy, adopts the budget, and makes final land use decisions.",
  "Planning Commission": "Reviews development proposals and zoning, and advises the council on land use.",
  "Parks and Recreation Commission": "Advises on parks, trails, recreation programs and facilities.",
  "Library Commission": "Advises on library services and programs for the Cupertino Library.",
  "Public Safety Commission": "Advises on policing, emergency preparedness, traffic safety and disaster readiness.",
  "Teen Commission": "Cupertino students advising the council on youth issues, programs and events.",
  "Housing Commission": "Advises on affordable housing policy and the use of housing funds.",
  "Sustainability Commission": "Advises on climate action, energy, water and waste reduction.",
  "Arts and Culture Commission": "Advises on public art, cultural programming and arts grants.",
  "Bicycle Pedestrian Commission": "Advises on walking and biking infrastructure and safe routes to school.",
  "Audit Committee": "Reviews the city's financial audits and internal controls.",
  "Economic Development Committee": "Advises on business retention, retail vitality and the local economy.",
  "Design Review Committee": "Reviews the architectural and site design of proposed projects.",
  "Environmental Review Committee": "Reviews environmental analysis required for projects under CEQA.",
  "Disaster Council": "Coordinates citywide emergency planning and disaster response.",
  "Fiscal Strategic Plan Committee": "Advises on long-range fiscal planning and revenue strategy.",
  "Legislative Review Committee": "Reviews state and federal legislation affecting Cupertino.",
  "Administrative Hearing": "Hears certain permit and code matters delegated to a hearing officer.",
  "Public Facilities Corporation": "A separate corporation that handles financing for city facilities.",
  TICC: "The Technology, Information and Communications Commission, advising on technology and public communication.",
};
