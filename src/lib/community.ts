/**
 * The community board: what a post is, and the rules it lives under.
 *
 * This is the only part of the site that publishes words the site did not
 * write. Everything else here is the city's own record or a candidate's own
 * material, checkable against a source. A board is not, so the rules it runs
 * under are the whole design rather than a detail of it, so they are stated
 * here rather than left to be reconstructed from the moderator prompt.
 *
 * Two choices are worth stating outright, because both are easy to reverse by
 * accident later:
 *
 * 1. Nothing is published until it has passed moderation. The obvious build is
 *    to publish immediately and delete what turns out to be bad, which is
 *    cheaper and reads the same in a demo. It is not the same in public: a post
 *    that was live for ninety seconds two months before an election has been
 *    read, screenshotted and quoted, and deleting it afterwards removes the
 *    site's copy rather than the post. Moderating on submit costs one model
 *    call and makes that failure impossible instead of unlikely.
 *
 * 2. Posters get an assigned pseudonym, never a typed name. A name field on a
 *    civic board during a campaign is an impersonation tool: the first person
 *    to post as a sitting councilmember does more damage than every off-topic
 *    post combined. Assigning the handle server side means the site cannot
 *    carry a false name, rather than promising to catch one.
 */
/**
 * The buckets posts are sorted into. Fixed rather than discovered: a
 * classifier that invents its own categories quietly reorganizes the board
 * every time the traffic mix shifts, and a reader who bookmarked a heading
 * finds it gone. These six cover what the rest of the site already reports on,
 * so a post has somewhere honest to land. Editing this list is a deliberate
 * act, and old posts keep whatever bucket they were filed under.
 */
export const TOPICS = [
  "Housing and development",
  "Elections and campaigns",
  "Budget and city spending",
  "Public safety and traffic",
  "Parks, schools and community life",
  "City hall and transparency",
] as const;

export type Topic = (typeof TOPICS)[number];

export interface Post {
  id: string;
  /** The resident's own words, unedited. Moderation decides whether a post
   *  appears, never what it says: a board that rewrites people is not one. */
  body: string;
  topic: Topic;
  /** Assigned pseudonym, derived from the poster's cookie. */
  handle: string;
  /** Epoch milliseconds. */
  createdAt: number;
}

/** A post's ceiling, in words. The number is the product's, not a technical
 *  limit: it keeps the board a place for a point rather than an essay. */
export const MAX_WORDS = 50;

/** Guards the model call. A body that could not possibly be 50 words is
 *  rejected on arrival rather than paid for. */
export const MAX_CHARS = 1_200;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Handles are derived from the cookie rather than stored beside it, so the
 * board needs no table mapping people to names and cannot leak one. The same
 * browser always renders the same handle, which is enough for a reader to see
 * that four posts in a thread came from one person.
 *
 * The words are deliberately generic. Naming real neighborhoods would have the
 * site asserting where someone lives, which it has no way to know and no
 * business implying.
 */
const ADJECTIVES = [
  "Quiet", "Amber", "Steady", "Patient", "Bright", "Golden", "Copper", "Silver",
  "Restless", "Cheerful", "Curious", "Modest", "Sunlit", "Windy", "Early", "Late",
];
const NOUNS = [
  "Sycamore", "Redwood", "Manzanita", "Toyon", "Madrone", "Poppy", "Sage", "Fern",
  "Quail", "Heron", "Sparrow", "Kestrel", "Foothill", "Meadow", "Orchard", "Creek",
];

/** A 32-bit hash of the cookie value. Not a security boundary: it only has to
 *  spread ids across the name space evenly and give the same answer twice. */
function hash(seed: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return h >>> 0;
}

export function handleFor(voiceId: string): string {
  const h = hash(voiceId);
  const adjective = ADJECTIVES[h % ADJECTIVES.length];
  const noun = NOUNS[(h >>> 8) % NOUNS.length];
  // The number lifts 256 combinations to 25,600, so two people on the board at
  // once are unlikely to read as the same person.
  const n = ((h >>> 16) % 90) + 10;
  return `${adjective} ${noun} ${n}`;
}

/** A new poster identity. Random rather than derived from anything about the
 *  request: an id computed from an IP address would make the handle a weak
 *  pseudonym for a real address, which is the opposite of the point. */
export function newVoiceId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
