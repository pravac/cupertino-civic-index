/**
 * Tools the assistant can call. Every one reads the same sources the rest of
 * the site reads, so the assistant cannot answer from a separate, staler copy
 * of reality than the pages a resident is looking at.
 *
 * Each tool returns compact text rather than raw JSON. Model context is the
 * scarce resource here, and a Legistar event object carries a dozen fields no
 * resident will ever ask about.
 */
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import {
  COUNCIL_BODY_ID,
  getAgendaItems,
  getBodies,
  getMeeting,
  getMeetingsInRange,
  getPastMeetings,
  getUpcomingMeetings,
  searchMatters,
} from "./legistar";
import { getNews, searchNews } from "./news";
import { getRecentVotes } from "./votes";
import { formatDate, todayInCupertino } from "./format";
import {
  COUNCIL,
  COUNCIL_FACTS,
  COUNCIL_LAST_VERIFIED,
  COUNCIL_SOURCE_URL,
} from "@/data/council";
import { CANDIDATES, ELECTION, ELECTION_CONTEXT } from "@/data/election";
import { BODY_DESCRIPTIONS, GUIDES } from "@/data/guides";
import type { Meeting } from "./types";

function describeMeeting(m: Meeting): string {
  const parts = [
    `[id ${m.id}] ${m.body}, ${formatDate(m.date)}`,
    m.time ?? "",
    m.canceled ? "CANCELED" : "",
    m.comment && !m.canceled ? `(${m.comment})` : "",
    m.location ? `at ${m.location}` : "",
    `official record: ${m.detailUrl}`,
  ];
  return parts.filter(Boolean).join(" | ");
}

export const chatTools = [
  betaTool({
    name: "find_meetings",
    description:
      "Find Cupertino public meetings. Use for questions about when a body meets, what is coming up, or what happened recently. Returns meeting ids that get_meeting_agenda accepts. Canceled meetings are labeled CANCELED and did not take place.",
    inputSchema: {
      type: "object",
      properties: {
        when: {
          type: "string",
          enum: ["upcoming", "past", "month"],
          description:
            "'upcoming' for scheduled meetings, 'past' for recent ones, 'month' to list a specific calendar month.",
        },
        month: {
          type: "string",
          description: "Required when 'when' is 'month'. Format YYYY-MM, e.g. 2026-08.",
        },
        council_only: {
          type: "boolean",
          description: "Limit results to the City Council, excluding commissions.",
        },
      },
      required: ["when"],
      additionalProperties: false,
    },
    run: async ({ when, month, council_only }) => {
      let meetings: Meeting[] = [];
      if (when === "month") {
        const key = /^\d{4}-\d{2}$/.test(month ?? "")
          ? (month as string)
          : todayInCupertino().slice(0, 7);
        const [y, mo] = key.split("-").map(Number);
        const next = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, "0")}-01`;
        meetings = (await getMeetingsInRange(`${key}-01`, next)).data;
      } else if (when === "past") {
        meetings = (await getPastMeetings(20)).data;
      } else {
        meetings = (await getUpcomingMeetings(30)).data;
      }
      if (council_only) meetings = meetings.filter((m) => m.bodyId === COUNCIL_BODY_ID);
      if (meetings.length === 0) {
        return `No meetings found. Today is ${formatDate(todayInCupertino())}. The city's calendar currently has no records for that window, which usually means it has not published them yet rather than that nothing is happening.`;
      }
      return meetings.map(describeMeeting).join("\n");
    },
  }),

  betaTool({
    name: "get_meeting_agenda",
    description:
      "Get what is on the agenda for one meeting, by the id returned from find_meetings. Standing participation notices are excluded because they repeat verbatim on every agenda.",
    inputSchema: {
      type: "object",
      properties: {
        meeting_id: { type: "number", description: "Meeting id from find_meetings." },
      },
      required: ["meeting_id"],
      additionalProperties: false,
    },
    run: async ({ meeting_id }) => {
      const [meetingResult, items] = await Promise.all([
        getMeeting(meeting_id),
        getAgendaItems(meeting_id),
      ]);
      const meeting = meetingResult.data;
      if (!meeting) return `No meeting found with id ${meeting_id}.`;
      const header = describeMeeting(meeting);
      if (meeting.canceled) {
        return `${header}\n\nThis meeting was canceled, so nothing on any published agenda was acted on.`;
      }
      const substantive = items.data.filter((i) => i.kind === "substantive");
      if (substantive.length === 0) {
        return `${header}\n\nNo agenda has been published for this meeting yet.`;
      }
      const lines = substantive.map(
        (i, n) =>
          `${n + 1}. ${i.title}${i.matterFile ? ` (file ${i.matterFile})` : ""}${
            i.action ? ` [${i.action}]` : ""
          }`,
      );
      return `${header}\n\n${lines.join("\n")}`;
    },
  }),

  betaTool({
    name: "get_council_info",
    description:
      "Who serves on the Cupertino City Council and how the council works. Use this before answering anything about the mayor, since the mayor is appointed by the council rather than elected by voters and residents commonly assume otherwise.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const roster = COUNCIL.map(
        (m) => `${m.name}, ${m.role}${m.termEnds ? `, term ends ${m.termEnds}` : ""}`,
      ).join("\n");
      const facts = COUNCIL_FACTS.map((f) => `${f.label}: ${f.value}`).join("\n");
      return `Current council (hand-verified ${formatDate(COUNCIL_LAST_VERIFIED)}):\n${roster}\n\nHow it works:\n${facts}\n\nOfficial council page: ${COUNCIL_SOURCE_URL}`;
    },
  }),

  betaTool({
    name: "get_election_info",
    description:
      "The November 3, 2026 Cupertino City Council election: candidates, what the race is about, and where voting logistics are handled. Use this for anything about the ballot, registering to vote, or deadlines, as well as for candidates. Present candidates even-handedly and never recommend one.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const list = CANDIDATES.map(
        (c) =>
          `${c.name}${c.incumbent ? " (incumbent)" : ""}: ${c.background}. ${
            c.slate ? `Slate: ${c.slate}. ` : ""
          }Stated priorities: ${c.priorities.join("; ")}.`,
      ).join("\n");
      return `${ELECTION.seats} seats on the ${ELECTION.office}, ${formatDate(
        ELECTION.date,
      )}. ${CANDIDATES.length} candidates.\n\nContext: ${ELECTION_CONTEXT}\n\n${list}\n\nRegistration, ballots and deadlines are handled by the Santa Clara County Registrar of Voters, not the city: ${ELECTION.registrarUrl}\nIndependent coverage of the race: ${ELECTION.coverageUrl}`;
    },
  }),

  betaTool({
    name: "list_commissions",
    description:
      "List Cupertino's commissions and committees, with what each one advises on. Use for questions about joining a commission or which body handles a topic.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: async () => {
      const bodies = (await getBodies()).data;
      if (bodies.length === 0) return "The city's records system could not be reached.";
      return bodies
        .map((b) => `${b.name} (${b.type})${BODY_DESCRIPTIONS[b.name] ? `: ${BODY_DESCRIPTIONS[b.name]}` : ""}`)
        .join("\n");
    },
  }),

  betaTool({
    name: "how_to_participate",
    description:
      "Step-by-step guidance on speaking at a meeting, contacting councilmembers, joining a commission, or watching a meeting.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: ["public-comment", "contact-council", "join-commission", "watch"],
        },
      },
      required: ["topic"],
      additionalProperties: false,
    },
    run: async ({ topic }) => {
      const guide = GUIDES.find((g) => g.slug === topic);
      if (!guide) return "No guide found for that topic.";
      return `${guide.title}\n${guide.summary}\n\n${guide.steps
        .map((s, i) => `${i + 1}. ${s}`)
        .join("\n")}\n\nOfficial page: ${guide.officialUrl}`;
    },
  }),

  betaTool({
    name: "get_voting_record",
    description:
      "How each member actually voted, recovered from meeting minutes. Returns the motion, who moved and seconded it, and every member listed under ayes, noes, abstain and absent. Use this for any question about how someone voted or where a body stood on something. Slow, because it reads PDFs, so call it only when the question is genuinely about votes.",
    inputSchema: {
      type: "object",
      properties: {
        body: {
          type: "string",
          description:
            "Body name or part of one, e.g. 'City Council' or 'Planning'. Defaults to the City Council.",
        },
        since_year: {
          type: "number",
          description: "Only minutes introduced on or after this year. Defaults to 2025.",
        },
        topic: {
          type: "string",
          description:
            "Subject to find votes about, e.g. 'Mary Avenue'. ALWAYS pass this when the question is about a specific thing; omit it only for 'how have they been voting lately'. Matching is literal against the minutes text, so use the words the city uses, not the words the person used: minutes say 'law enforcement contract', not 'sheriff'. Search the city records first if you are unsure of the official wording, and retry with a different term before concluding there is no vote.",
        },
      },
      additionalProperties: false,
    },
    run: async ({ body, since_year, topic }) => {
      const since = `${Math.min(Math.max(since_year ?? 2025, 2000), 2100)}-01-01`;
      const result = await getRecentVotes(body ?? "City Council", since, topic);
      if (result.data.length === 0) {
        const retry = topic
          ? ` Matching is literal, so try a broader or different word before concluding there is none: a single distinctive word ("Vallco", "Torre") beats a phrase, and the city's own wording beats the everyday term. Searching the city records will show you how staff titled the item.`
          : "";
        return `No recorded votes found. ${result.error ?? ""}${retry} Minutes are only published after a body approves them at a later meeting, so recent meetings will not have any yet.`;
      }
      const out = result.data.map((rec) => {
        const lines = rec.motions.map((m) => {
          const tally = [
            `Ayes: ${m.ayes.join(", ") || "none"}`,
            `Noes: ${m.noes.join(", ") || "none"}`,
            m.abstain.length ? `Abstain: ${m.abstain.join(", ")}` : "",
            m.absent.length ? `Absent: ${m.absent.join(", ")}` : "",
          ]
            .filter(Boolean)
            .join(" | ");
          return `  - ${m.text.slice(0, 300)}\n    ${tally}`;
        });
        return `${rec.body} meeting of ${rec.meetingDate ?? "unknown date"} (minutes ${rec.file ?? "n/a"})\n${lines.join(
          "\n",
        )}\n  Source PDF: ${rec.pdfUrl}`;
      });
      return `${out.join("\n\n")}\n\nThese come from the approved minutes PDF, which is the only place Cupertino records individual votes. Only the most recent few meetings are read per request.`;
    },
  }),

  betaTool({
    name: "search_city_records",
    description:
      "Search Cupertino's legislative record by keyword: every item staff have filed, across all meetings and years. Use this FIRST for any question about a specific project, street, address, development, ordinance, or topic, for example 'Mary Avenue', 'Vallco', 'bike lane', 'plastic bag'. It finds the paper trail when you do not already know which meeting to look at.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Words that would appear in the item's title, e.g. a street name or project name. Keep it short; two or three words match best.",
        },
        since_year: {
          type: "number",
          description: "Only items introduced on or after this year. Defaults to 2024.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    run: async ({ query, since_year }) => {
      const since = `${Math.min(Math.max(since_year ?? 2024, 2000), 2100)}-01-01`;
      const hits = (await searchMatters(query, since)).data;
      if (hits.length === 0) {
        return `Nothing in the city's legislative record matches "${query}" since ${since.slice(0, 4)}. Try fewer or different words, an earlier since_year, or search local news instead.`;
      }
      return hits
        .map(
          (h) =>
            `${h.introduced ? h.introduced.slice(0, 10) : "undated"} | ${h.body ?? "unknown body"} | file ${
              h.file ?? "n/a"
            } | ${h.title.slice(0, 220)}\n    ${h.url}`,
        )
        .join("\n");
    },
  }),

  betaTool({
    name: "search_local_news",
    description:
      "News headlines about Cupertino from local outlets. With a query it searches the past two years; without one it returns recent headlines. Use it for public reaction, lawsuits, and context that never reaches the city's own record. Headlines only: attribute to the outlet, never state one as established fact.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional keyword filter, e.g. 'housing' or 'school'.",
        },
      },
      additionalProperties: false,
    },
    run: async ({ query }) => {
      // With a query, search live over two years. Without one, show the
      // recent topic feeds. Filtering the 60-day feeds by keyword missed
      // anything older, which is usually the thing being asked about.
      const items = query ? await searchNews(query) : (await getNews(40)).data;
      if (items.length === 0) {
        return query
          ? `No headlines found about "${query}" in the last two years.`
          : "No recent headlines available.";
      }
      return items
        .slice(0, 15)
        .map((i) => `${i.title} (${i.source}) ${i.url}`)
        .join("\n");
    },
  }),
];
