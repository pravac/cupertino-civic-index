/**
 * The gate every post passes through before it is published.
 *
 * One model call does two jobs: decide whether a post may appear, and file it
 * under a topic. They are one call rather than two because the same reading of
 * the post answers both, and because a board that costs two calls per post is
 * a board someone turns off.
 *
 * The decision is deliberately conservative in one direction only. A rejected
 * post is returned to its author with the reason, in an editable box, so the
 * cost of a wrong rejection is a rewrite. A wrongly published post about a
 * named person during a campaign is not recoverable by editing anything.
 */
import Anthropic from "@anthropic-ai/sdk";
import { MAX_WORDS, TOPICS, type Topic } from "./community";

/** The same model the assistant uses. Moderation here is not keyword matching:
 *  the line the board draws is between a first-person account and an asserted
 *  fact about someone, which is a judgment about how a sentence is framed. */
const MODEL = "claude-opus-5";

/** Thinking is on by default on this model and shares the ceiling with the
 *  reply, so this covers both. The reply itself is three short fields. */
const MAX_TOKENS = 4_000;

export interface Verdict {
  decision: "publish" | "reject";
  topic: Topic;
  /** Shown to the author when a post is rejected, so a rewrite is possible.
   *  A rejection with no reason reads as the site silencing someone. */
  reason: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["publish", "reject"] },
    topic: { type: "string", enum: [...TOPICS] },
    reason: { type: "string" },
  },
  required: ["decision", "topic", "reason"],
  additionalProperties: false,
};

const SYSTEM = `You are the moderator for the community board on Cupertino Eye, an independent guide to local government in Cupertino, California. A resident has submitted a post. Decide whether it is published, and file it under one topic.

The board exists so residents can talk to each other about this city: what the council is doing, what is being built, how the campaign is going, what they are seeing in their neighborhood. Err toward publishing an awkwardly worded post that belongs here. Do not reject someone for being angry, blunt, or critical of the city or of a candidate. Criticism of people in power is the point of a civic board, not a problem with it.

PUBLISH a post that is about Cupertino and current. That includes the city government, the council and commissions, the November 2026 council election and the campaign around it, local development and housing, city spending, schools, parks, traffic, public safety, and local businesses and events. A post about a neighboring city or the county counts when it plainly bears on Cupertino.

REJECT a post that is:
- Not about Cupertino, or not about anything current. National politics with no local hook, general commentary, and historical trivia all go.
- Profane, slurring, or abusive toward anyone, including a public figure.
- Threatening, or harassing a specific person.
- Publishing private information: a home address, a phone number, a workplace, a photograph of someone, anything that identifies a private individual.
- Commercial: promotion, solicitation, spam, or a link farm.
- Over ${MAX_WORDS} words.

WRITING ABOUT NAMED PEOPLE is where this board earns its keep and where it can do real harm, so read carefully.

Publish:
- Anything about a public figure's public conduct: their stated positions, how they voted, what they said at a meeting, what their campaign has published. "Fruen voted for this and I think he was wrong" is ordinary civic speech.
- A first-person account of something the poster themselves saw or experienced, told as their own experience. "I watched two people pulling campaign signs out of the median on Stevens Creek on Saturday" is publishable. So is "a canvasser came to my door and would not leave when I asked."

Reject:
- A flat assertion of fact or character about a named person that the poster is not describing witnessing. "Rao is corrupt", "Tang took developer money", "the mayor rigged the vote" are rejected however strongly the poster believes them. The board is not a place to publish an accusation nobody can check.
- A first-person frame wrapped around an accusation the poster could not have witnessed. "I know for a fact that X is being paid by developers" is not a personal account; it is the same accusation with four words in front of it.
- Any accusation against a private individual, whether or not the poster witnessed it. A neighbor is not a public figure.

The distinction is between what someone saw and what someone concluded about another person. Someone reporting what they observed, in their own words, is speaking for themselves. Someone stating as fact that a named person did something wrong is asking this site to publish that claim.

TOPIC: file every post under exactly one of the listed topics, including a post you are rejecting. Pick the closest one.

REASON: one plain sentence. When you reject, say what is wrong in a way that lets the person fix it and post again, addressed to them: "This reads as an accusation about a named person rather than something you saw yourself. Say what you observed and it can go up." When you publish, one short sentence is enough. Never use em dashes or en dashes.`;

/**
 * Returns a verdict, or null when the model could not be reached. The route
 * turns a null into a plain failure rather than into a publish: an unreachable
 * moderator means the board stops accepting posts, not that it accepts
 * everything. That is the one direction this can fail in safely.
 */
export async function moderate(body: string): Promise<Verdict | null> {
  const client = new Anthropic();
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Deciding how a sentence is framed is a judgment, not a lookup, so this
      // is not a low-effort task. It is also one short paragraph, so medium is
      // where the quality stops improving.
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: body }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = JSON.parse(text) as Verdict;

    // Structured outputs make this near impossible, which is exactly why it is
    // worth failing on rather than trusting: a post must never publish because
    // a field arrived in a shape nobody checked.
    if (parsed.decision !== "publish" && parsed.decision !== "reject") return null;
    if (!TOPICS.includes(parsed.topic)) return null;
    return parsed;
  } catch (err) {
    console.error("community moderation failed", err);
    return null;
  }
}
