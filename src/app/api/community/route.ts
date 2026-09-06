import { cookies } from "next/headers";
import { callerFrom } from "@/lib/apim";
import {
  MAX_CHARS,
  MAX_WORDS,
  handleFor,
  newVoiceId,
  wordCount,
  type Post,
} from "@/lib/community";
import { POST_LIMITS, postingAllowed, readPosts, savePost } from "@/lib/community-store";
import { moderate } from "@/lib/moderation";

// The SDK needs Node APIs, so this route cannot run on the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The poster's identity, and whether it had to be minted. Cookies can only be
 *  written from a route handler, so a first-time poster gets theirs here. */
const COOKIE = "cc_voice";
/** A year. Long enough that a regular is still the same handle next season,
 *  short enough that an abandoned browser does not carry one forever. */
const COOKIE_MAX_AGE = 31_536_000;

async function voice(): Promise<{ id: string; fresh: boolean }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) return { id: existing, fresh: false };
  return { id: newVoiceId(), fresh: true };
}

/** The board, newest first. */
export async function GET() {
  return Response.json({ posts: await readPosts() });
}

/**
 * Submit a post. It is moderated before it is stored, so the response either
 * carries the published post or the reason it was turned down. Nothing reaches
 * the board in between.
 */
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "The board is not accepting posts right now." },
      { status: 503 },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_CHARS * 4) {
    return Response.json({ error: "That post is too long." }, { status: 413 });
  }

  let body: string;
  try {
    body = String((JSON.parse(raw) as { body?: unknown }).body ?? "").trim();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  if (body.length === 0) {
    return Response.json({ error: "Write something first." }, { status: 400 });
  }
  // Counted here rather than by the model: the limit is arithmetic, and the
  // author gets the exact number back instead of a paid-for opinion about it.
  const words = wordCount(body);
  if (words > MAX_WORDS || body.length > MAX_CHARS) {
    return Response.json(
      { error: `Posts are ${MAX_WORDS} words at most. That one is ${words}.` },
      { status: 400 },
    );
  }

  const caller = callerFrom(req);
  const allowed = await postingAllowed(caller);
  if (allowed !== "ok") {
    const limit =
      allowed === "hour"
        ? `${POST_LIMITS.perCallerPerHour} posts an hour`
        : `${POST_LIMITS.perCallerPerDay} posts a day`;
    return Response.json(
      { error: `The board takes ${limit} from one person. Come back a bit later.` },
      { status: 429 },
    );
  }

  const verdict = await moderate(body);
  if (!verdict) {
    return Response.json(
      { error: "Moderation is unavailable, so the board is not taking posts right now. Try again shortly." },
      { status: 503 },
    );
  }

  const { id: voiceId, fresh } = await voice();
  // Set the cookie on any answered submission, including a rejection, so the
  // author's next attempt is the same person rather than a new one.
  //
  // Secure only over https: a Secure cookie is dropped by the browser on plain
  // http, so hardcoding it would silently mint a new handle on every post in
  // local development and make the identity look broken where it is fine.
  const https = (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol).startsWith("https");
  const headers = new Headers();
  if (fresh) {
    headers.append(
      "Set-Cookie",
      `${COOKIE}=${voiceId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${https ? "; Secure" : ""}`,
    );
  }

  if (verdict.decision === "reject") {
    return Response.json({ rejected: true, reason: verdict.reason }, { status: 200, headers });
  }

  const post: Post = {
    id: crypto.randomUUID(),
    body,
    topic: verdict.topic,
    handle: handleFor(voiceId),
    createdAt: Date.now(),
  };

  if (!(await savePost(post))) {
    return Response.json(
      { error: "Your post passed moderation but could not be saved. Nothing was published, so try again." },
      { status: 503, headers },
    );
  }

  return Response.json({ post }, { status: 201, headers });
}
