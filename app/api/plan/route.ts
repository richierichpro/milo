import { gatherCandidates } from "@/lib/gather";
import type { StreamMessage } from "@/lib/messages";
import { ndjsonResponse } from "@/lib/ndjson";
import { pickSquadFlights } from "@/lib/land-together";
import { planTrip } from "@/lib/planner";
import { findDestinations } from "@/lib/squad";
import type { CallLogEntry } from "@/lib/types";
import { parseTripInput } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const trip = parseTripInput(await req.json().catch(() => null));
  if (typeof trip === "string") return Response.json({ error: trip }, { status: 400 });

  return ndjsonResponse<StreamMessage>(async (send) => {
    const progress = (text: string) => send({ type: "progress", text });
    if (!trip.destination) {
      // Squad Match: where can everyone afford to go?
      const receipts: CallLogEntry[] = [];
      const match = await findDestinations(trip.squad, trip.startDate, trip.endDate, trip.budgetPerPerson, { log: receipts, onProgress: progress });
      send({ type: "destinations", match, receipts });
      return;
    }
    const pool = await gatherCandidates(trip, progress);
    for (const e of pool.errors) send({ type: "progress", text: `⚠ ${e}` });
    progress("Lining up flights so everyone lands together…");
    const itinerary = await planTrip(pool, trip, {
      pickFlights: (p, t) => pickSquadFlights(p.flightsOut, p.flightsBack, t.squad),
      onProgress: progress,
    });
    send({ type: "plan", itinerary, receipts: pool.receipts, pool });
  });
}
