import { LIMITS, callerFrom, questionsLeft } from "@/lib/apim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How many questions this visitor has left today. Read only: opening the page
 *  must never spend one. */
export async function GET(req: Request) {
  return Response.json(
    { left: await questionsLeft(callerFrom(req)), limit: LIMITS.perCallerPerDay },
    { headers: { "Cache-Control": "no-store" } },
  );
}
