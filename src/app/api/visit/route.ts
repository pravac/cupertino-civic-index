import { recordVisit, readVisits } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read the running total without recording a visit. */
export async function GET() {
  return Response.json({ total: await readVisits() });
}

/** Record a visit and return the new total. */
export async function POST() {
  return Response.json({ total: await recordVisit() });
}
