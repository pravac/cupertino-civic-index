/**
 * Roll-call votes, recovered from meeting minutes.
 *
 * Cupertino publishes no vote data through the Legistar API: the votes
 * endpoint is empty, no event carries a minutes file, and across a thousand
 * sampled meetings not one has structured actions. The votes exist only as
 * prose inside minutes PDFs, which are themselves filed as attachments to the
 * later "Approval of Minutes" agenda item rather than attached to the meeting
 * they describe.
 *
 * So the path is: find the minutes matter, follow it to its attachment, read
 * the PDF, and parse the motion blocks. Every motion records the mover, the
 * seconder, and each member by name under Ayes, Noes, Abstain and Absent.
 *
 * This is the single most useful thing the record contains and the hardest to
 * get at, which is exactly why it is worth doing here rather than leaving
 * every resident to do it by hand.
 */
import { extractText, getDocumentProxy } from "unpdf";
import type { Sourced } from "./types";

const TIMEOUT_MS = 15_000;
const REVALIDATE = 86_400; // Minutes are immutable once approved.
/** Without a topic, just show the latest meetings. */
const MAX_RECENT_PDFS = 4;
/** With a topic, scan deeper: the vote being asked about is usually not in the
 *  last few meetings, which is the whole reason someone is asking. */
const MAX_SCANNED_PDFS = 14;
/** Stop once enough meetings match, so a common word does not read everything. */
const MAX_MATCHING_PDFS = 4;

export interface Motion {
  /** The full sentence as recorded, so nothing is lost in summarizing. */
  text: string;
  moved?: string;
  seconded?: string;
  ayes: string[];
  noes: string[];
  abstain: string[];
  absent: string[];
  recused: string[];
  passed: boolean | null;
  /**
   * False when the tally could not be read with confidence. A wrong vote is a
   * defect; an unread one is only a gap, so anything that does not parse
   * cleanly is reported as unreadable rather than as a partial tally.
   */
  readable: boolean;
  /** Why it could not be read, shown to the reader instead of a guess. */
  problem?: string;
}

export interface MinutesRecord {
  body: string;
  file: string | null;
  /** Date of the meeting the minutes describe, parsed from the item title. */
  meetingDate: string | null;
  pdfUrl: string;
  motions: Motion[];
}

interface RawMatter {
  MatterId: number;
  MatterFile: string | null;
  MatterTitle: string | null;
  MatterBodyName: string | null;
  MatterIntroDate: string | null;
}

interface RawAttachment {
  MatterAttachmentName: string | null;
  MatterAttachmentHyperlink: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) throw new Error(`Legistar responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every tally label a clerk might use. Matched case-sensitively with an
 * explicit first-letter class, because the whole pattern cannot use the `i`
 * flag: under `i`, `[A-Z]` also matches lowercase, which silently disabled the
 * initial-detection lookbehind below and let the last tally run into the
 * following paragraph.
 */
const LABEL = String.raw`[Aa]yes?|[Nn]oes?|[Nn]ays?|[Aa]bstain(?:ed|ing)?|[Aa]bsent|[Rr]ecus(?:ed|al)`;

/** A name is a surname, optionally preceded by initials ("J.R. Fruen"). */
const NAME_OK = /^(?:[A-Z]\.\s*){0,3}[A-Z][A-Za-z'’-]{1,30}(?:\s+[A-Z][A-Za-z'’-]{1,30})?$/;

interface Tally {
  names: string[];
  /** Present but unreadable, as opposed to absent from the record. */
  malformed: boolean;
}

/**
 * "Ayes: Moore, Chao, J.R. Fruen, and R. Wang." -> the four names.
 *
 * Capturing stops at the next tally label or at a sentence-ending period,
 * never at any period. Periods appear inside names, and an earlier version
 * that cut at the first one silently truncated the list: a 4-0 vote was
 * reported as 2 ayes with no sign anything was missing. A period preceded by a
 * lone capital is an initial, not a sentence end, so the lookbehind keeps it.
 */
function tally(block: string, label: string): Tally {
  const re = new RegExp(
    `\\b(?:${label})\\s*:\\s*([\\s\\S]*?)(?=(?<![A-Z])\\.|\\b(?:${LABEL})\\s*:|$)`,
  );
  const m = block.match(re);
  if (!m) return { names: [], malformed: false };

  const raw = m[1].trim().replace(/[.;]\s*$/, "");
  // A tally that runs long has escaped its clause into surrounding prose.
  if (raw.length > 200) return { names: [], malformed: true };
  if (/^(none|n\/a)$/i.test(raw)) return { names: [], malformed: false };

  const parts = raw
    .replace(/\band\b/gi, ",")
    .split(",")
    .map((x) => x.trim().replace(/[.;]$/, ""))
    .filter(Boolean);

  const good = parts.filter((x) => NAME_OK.test(x));
  // If any fragment is not name-shaped, the whole tally is suspect.
  return { names: good, malformed: good.length !== parts.length };
}

export function parseMotions(text: string): Motion[] {
  const flat = text.replace(/[ \t]+/g, " ");
  // Split on the MOTION marker rather than regex-matching a whole block. A
  // non-greedy block pattern terminates at whichever clause appears first, so
  // "The motion passed with the following vote: Ayes: ..." ended the match at
  // the ayes and silently dropped the Noes, Abstain and Absent tallies. Losing
  // the noes is losing the entire point of a roll call.
  const segments = flat
    .split(/MOTION\s*:/i)
    .slice(1)
    // Cap each segment so one motion cannot swallow the next section's prose.
    .map((seg) => seg.slice(0, 1200));

  return segments.map((seg) => {
    const b = `MOTION: ${seg}`;
    const one = b.replace(/\s+/g, " ").trim();
    const mv = one.match(/MOTION:\s*([A-Z][\w'-]*)\s+moved/i);
    const sc = one.match(/and\s+([A-Z][\w'-]*)\s+seconded/i);
    const failed = /motion failed/i.test(one);
    const passed = /motion (?:passed|carried)/i.test(one);

    const ayes = tally(one, "[Aa]yes?");
    const noes = tally(one, "[Nn]oes?|[Nn]ays?");
    const abstain = tally(one, "[Aa]bstain(?:ed|ing)?");
    const absent = tally(one, "[Aa]bsent");
    const recused = tally(one, "[Rr]ecus(?:ed|al)");

    const malformed = [ayes, noes, abstain, absent, recused].some((t) => t.malformed);
    const anyName =
      ayes.names.length + noes.names.length + abstain.names.length + absent.names.length + recused.names.length;
    // A recorded vote states an aye tally. Its absence means this is prose
    // about a motion, or a shape we do not understand.
    const hasAyeLabel = /\bAyes?\s*:/i.test(one);

    let problem: string | undefined;
    if (malformed) problem = "the tally did not match the usual wording";
    else if (hasAyeLabel && ayes.names.length === 0 && !/Ayes?\s*:\s*None/i.test(one))
      problem = "the ayes could not be read";
    else if (!hasAyeLabel && anyName === 0) problem = "no roll call was recorded for this motion";

    return {
      text: one,
      moved: mv?.[1],
      seconded: sc?.[1],
      ayes: ayes.names,
      noes: noes.names,
      abstain: abstain.names,
      absent: absent.names,
      recused: recused.names,
      passed: passed ? true : failed ? false : null,
      readable: !problem,
      problem,
    };
  })
    // Keep anything that looks like a recorded vote, readable or not. Dropping
    // the unreadable ones would hide exactly the cases worth flagging.
    .filter(
      (m) =>
        m.ayes.length + m.noes.length + m.abstain.length + m.absent.length + m.recused.length > 0 ||
        (m.problem !== undefined && m.problem !== "no roll call was recorded for this motion"),
    );
}

/** Minutes items name the meeting they cover, e.g. "May 20, 2026 minutes". */
function meetingDateFrom(title: string): string | null {
  const m = title.match(
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})/i,
  );
  if (!m) return null;
  const month =
    [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december",
    ].indexOf(m[1].toLowerCase()) + 1;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

async function extractPdf(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: REVALIDATE } });
    if (!res.ok) throw new Error(`Minutes PDF responded ${res.status}`);
    const doc = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
    // mergePages returns a single string for the whole document.
    const { text } = await extractText(doc, { mergePages: true });
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Recent minutes for a body, with their motions parsed. `body` matches on a
 * substring so "Council" finds the City Council.
 */
export async function getRecentVotes(
  body = "City Council",
  sinceIso = "2025-01-01",
  topic?: string,
  meetingDate?: string,
): Promise<Sourced<MinutesRecord[]>> {
  const needle = topic?.trim().toLowerCase();
  const wantDate = /^\d{4}-\d{2}-\d{2}$/.test(meetingDate ?? "") ? meetingDate : undefined;
  const origin = "Meeting minutes (Legistar attachments)";
  const base = "https://webapi.legistar.com/v1/cupertino";
  const filter = `substringof('Minutes',MatterTitle) and MatterIntroDate gt datetime'${sinceIso}'`;

  try {
    const matters = await fetchJson<RawMatter[]>(
      `${base}/matters?$filter=${encodeURIComponent(filter)}&$orderby=${encodeURIComponent(
        "MatterIntroDate desc",
      )}&$top=200`,
    );

    let wanted = matters.filter((m) =>
      (m.MatterBodyName ?? "").toLowerCase().includes(body.toLowerCase()),
    );

    // "What happened on July 21" is a common way to ask, and without this the
    // caller has to invent a topic and hope it matches.
    if (wantDate) {
      const onDate = wanted.filter((m) => meetingDateFrom(m.MatterTitle ?? "") === wantDate);
      if (onDate.length > 0) wanted = onDate;
    }

    const records: MinutesRecord[] = [];
    let scanned = 0;
    for (const m of wanted) {
      if (wantDate) {
        if (records.length >= 2) break;
      } else if (needle) {
        if (records.length >= MAX_MATCHING_PDFS || scanned >= MAX_SCANNED_PDFS) break;
      } else if (records.length >= MAX_RECENT_PDFS) {
        break;
      }
      let atts: RawAttachment[];
      try {
        atts = await fetchJson<RawAttachment[]>(`${base}/matters/${m.MatterId}/attachments`);
      } catch {
        continue;
      }
      const pdf = atts.find((a) => a.MatterAttachmentHyperlink?.endsWith(".pdf"));
      if (!pdf?.MatterAttachmentHyperlink) continue;

      let motions: Motion[] = [];
      let fullText = "";
      try {
        fullText = await extractPdf(pdf.MatterAttachmentHyperlink);
        motions = parseMotions(fullText);
      } catch {
        // A single unreadable PDF should not lose the others.
        continue;
      }
      scanned++;
      if (motions.length === 0) continue;

      if (needle && !wantDate) {
        // Keep a meeting only if the topic appears somewhere in it, then keep
        // the motions that name it. Some motions reference the subject only in
        // surrounding prose, so fall back to the whole meeting when the
        // document matches but no single motion does.
        if (!fullText.toLowerCase().includes(needle)) continue;
        const hits = motions.filter((mo) => mo.text.toLowerCase().includes(needle));
        motions = hits.length > 0 ? hits : motions;
      }

      records.push({
        body: m.MatterBodyName ?? body,
        file: m.MatterFile,
        meetingDate: meetingDateFrom(m.MatterTitle ?? ""),
        pdfUrl: pdf.MatterAttachmentHyperlink,
        motions,
      });
    }

    return {
      data: records,
      health: records.length > 0 ? "live" : "unavailable",
      origin,
      fetchedAt: new Date().toISOString(),
      error:
        records.length === 0
          ? wantDate
            ? `No approved minutes found for a ${body} meeting on ${wantDate}. Minutes are adopted at a later meeting, so a recent date may not have any yet.`
            : needle
            ? `No approved minutes mentioning "${topic}" were found for that body since ${sinceIso.slice(0, 4)}. It may predate the window, or the minutes may not be adopted yet.`
            : "No minutes with recorded votes were found for that body and window."
          : undefined,
    };
  } catch (err) {
    return {
      data: [],
      health: "unavailable",
      origin,
      fetchedAt: new Date().toISOString(),
      error: String(err),
    };
  }
}
