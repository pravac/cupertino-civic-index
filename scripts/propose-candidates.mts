/**
 * Proposes a campaign page for each candidate, with the evidence for it, so a
 * person can confirm in a minute instead of researching from scratch.
 *
 * This is the automated half of adding a new election cycle. It does not write
 * anything the site publishes. Deciding that a URL really belongs to a named
 * candidate is the one step left to a human, because the ways it goes wrong
 * are all plausible-looking: a site from a prior cycle, a different person with
 * the same name, a committee that supports a candidate without speaking for
 * them, an opposition page, a news profile. Each of those reads as a hit, and
 * publishing quotes under the wrong person's name is not a mistake a civic
 * site gets to take back.
 *
 *   npm run propose:candidates                 # candidates with no source yet
 *   npm run propose:candidates -- "Jane Doe"   # a name not in the config yet
 */
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { ELECTION } from "../src/data/election";

const OUT = "src/data/candidate-proposals.json";

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Set ANTHROPIC_API_KEY. Try: set -a; . ./.env.local; set +a");
  process.exit(1);
}

const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets =
  named.length > 0
    ? named
    : ELECTION.candidates.filter((c) => c.sources.length === 0).map((c) => c.name);

if (targets.length === 0) {
  console.log("Every candidate already has a confirmed source. Nothing to propose.");
  process.exit(0);
}

interface Proposal {
  url: string;
  label: string;
  pageKind: "campaign_site" | "news_profile" | "committee_or_pac" | "social" | "unclear";
  namesThisOfficeAndCycle: boolean;
  hasPaidForByDisclosure: boolean;
  evidence: string[];
  risks: string[];
  confidence: "high" | "medium" | "low";
}

/** Asked for as text rather than through structured outputs: the web search
 *  server tool is doing the work here, and keeping the request to one plain
 *  call avoids depending on how the two features compose. The parse below is
 *  strict, so a malformed answer fails loudly rather than half-populating. */
const CONTRACT = `Reply with one JSON object and nothing else, matching:
{"proposals":[{"url":string,"label":string,"pageKind":"campaign_site"|"news_profile"|"committee_or_pac"|"social"|"unclear","namesThisOfficeAndCycle":boolean,"hasPaidForByDisclosure":boolean,"evidence":[string],"risks":[string],"confidence":"high"|"medium"|"low"}],"notes":string}`;

const client = new Anthropic();

/** Resume rather than restart. Each candidate is a couple of minutes of web
 *  search, so a run that loses everything on an interruption is a run nobody
 *  will finish. Pass --force to re-research names already in the file. */
const previous = existsSync(OUT)
  ? (JSON.parse(readFileSync(OUT, "utf8")) as {
      cycle?: string;
      results?: Record<string, { proposals: Proposal[]; notes: string }>;
    })
  : {};
const force = process.argv.includes("--force");
const results: Record<string, { proposals: Proposal[]; notes: string }> =
  !force && previous.cycle === ELECTION.date ? (previous.results ?? {}) : {};

const write = () =>
  writeFileSync(
    OUT,
    JSON.stringify({ proposedAt: new Date().toISOString(), cycle: ELECTION.date, results }, null, 2) + "\n",
  );

for (const name of targets) {
  if (results[name] && !force) {
    console.log(`  skipping: ${name} (already in ${OUT}, pass --force to redo)`);
    continue;
  }
  process.stdout.write(`  searching: ${name} ... `);
  const res = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8_000,
    output_config: { effort: "high" },
    tools: [{ type: "web_search_20260209", name: "web_search" } as never],
    system: `You find the official campaign page for a named local candidate and report the evidence for and against it belonging to them. You do not decide; a person does. Report what you found, including what is doubtful.

Weigh these, because each one looks like a hit and is not:
- a site from an earlier election cycle that is still online
- a different person with the same name
- a committee or independent expenditure page that supports the candidate without being theirs
- an opposition or parody page, which will mention the candidate constantly
- a news profile or endorsement write-up

Evidence that actually distinguishes an official page: it names this exact office and this election, it carries a California "Paid for by" committee disclosure, it is written in the first person by the candidate, and the domain was registered for this cycle. Say plainly when you cannot find a page. An empty proposals list is a correct answer and is far better than a plausible guess.

${CONTRACT}`,
    messages: [
      {
        role: "user",
        content: `Candidate: ${name}\nOffice: ${ELECTION.office}\nElection: ${ELECTION.label}, ${ELECTION.date}\nCity: Cupertino, California`,
      },
    ],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    results[name] = JSON.parse(json);
    console.log(`${results[name].proposals.length} proposal(s)`);
  } catch {
    results[name] = { proposals: [], notes: `Could not parse a reply for ${name}.` };
    console.log("PARSE FAILED");
  }
  // After each candidate, not at the end: a long run must survive being cut off.
  write();
}

console.log("\n" + "=".repeat(72));
console.log("REVIEW THESE. Nothing reaches the site until you paste one in by hand.\n");
for (const [name, r] of Object.entries(results)) {
  console.log(`${name}`);
  if (r.proposals.length === 0) console.log(`  no candidate page found. ${r.notes}`);
  for (const p of r.proposals) {
    console.log(`  ${p.url}`);
    console.log(`    kind=${p.pageKind} confidence=${p.confidence} office+cycle=${p.namesThisOfficeAndCycle} paid-for-by=${p.hasPaidForByDisclosure}`);
    for (const e of p.evidence) console.log(`    for:   ${e}`);
    for (const x of p.risks) console.log(`    doubt: ${x}`);
    console.log(`    once confirmed, paste into that candidate in src/data/election.ts:`);
    console.log(`      sources: [{ url: "${p.url}", label: "${p.label}", confirmedOn: "${new Date().toISOString().slice(0, 10)}" }],`);
  }
  console.log("");
}
console.log("Then: npm run snapshot:candidates");
