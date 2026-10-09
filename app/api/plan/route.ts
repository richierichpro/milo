import { gatherCandidates } from "@/lib/gather";
import type { StreamMessage } from "@/lib/messages";
import { ndjsonResponse } from "@/lib/ndjson";
import { planTrip } from "@/lib/planner";
import { parseTripInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const trip = parseTripInput(await req.json().catch(() => null));
  if (typeof trip === "string") return Response.json({ error: trip }, { status: 400 });

  return ndjsonResponse<StreamMessage>(async (send) => {
    if (!trip.destination) throw new Error("Pick a destination.");
    const pool = await gatherCandidates(trip, (text) => send({ type: "progress", text }));
    for (const e of pool.errors) send({ type: "progress", text: `⚠ ${e}` });
    const itinerary = await planTrip(pool, trip, { onProgress: (text) => send({ type: "progress", text }) });
    send({ type: "plan", itinerary, receipts: pool.receipts, pool });
  });
}
