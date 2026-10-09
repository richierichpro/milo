// Records one full demo run into demo-data/ so Pakka works without API keys.
// Run with real keys: npm run record:demo
import { mkdir, writeFile } from "node:fs/promises";
import { editPlan } from "../lib/agent";
import { DEMO_TRIP } from "../lib/demo-trip";
import { gatherCandidates } from "../lib/gather";
import { pickSquadFlights } from "../lib/land-together";
import { parseTripInput } from "../lib/validate";
import { planTrip } from "../lib/planner";
import { findDestinations } from "../lib/squad";
import type { CallLogEntry, TripInput } from "../lib/types";

const CHIPS = ["Make it cheaper", "Kabir can't leave Delhi before 6pm Friday", "Add a sunset cruise", "Make day 2 more adventurous"];

async function main() {
  process.env.RECORD_DEMO = "true";
  const log: CallLogEntry[] = [];
  // Same shape the browser sends, so requests (and recordings) match exactly.
  const blank = parseTripInput({ ...DEMO_TRIP, destination: "" }) as TripInput;

  console.log("1. Squad Match with no destination");
  const match = await findDestinations(blank.squad, blank.startDate, blank.endDate, blank.budgetPerPerson, { log });
  const goa = match.options.find((o) => o.destination.name === "Goa");
  if (!goa) throw new Error("Goa isn't in the Squad Match results; pick another destination for the demo.");

  console.log("2. Plan Goa");
  const trip = parseTripInput({ ...blank, destination: goa.destination.name, destinationAirport: goa.destination.airportCode }) as TripInput;
  const pool = await gatherCandidates(trip);
  log.push(...pool.receipts);
  const itinerary = await planTrip(pool, trip, { pickFlights: (p, t) => pickSquadFlights(p.flightsOut, p.flightsBack, t.squad) });
  console.log(`   ${itinerary.title} · verified ${itinerary.verification.verified}/${itinerary.verification.total}`);

  // Also record the plan for a typed-in "Goa" (no Squad Match first).
  const typed = parseTripInput(DEMO_TRIP) as TripInput;
  await planTrip(await gatherCandidates(typed), typed, { pickFlights: (p, t) => pickSquadFlights(p.flightsOut, p.flightsBack, t.squad) });

  for (const [i, chip] of CHIPS.entries()) {
    console.log(`${3 + i}. Chat: ${chip}`);
    try {
      const r = await editPlan(itinerary, pool, chip, (t) => console.log(`   ${t}`));
      log.push(...r.receipts);
      console.log(`   → ${r.text} (verified ${r.itinerary.verification.verified}/${r.itinerary.verification.total})`);
    } catch (err) {
      console.log(`   ✗ ${(err as Error).message}`);
    }
  }

  await mkdir("demo-data", { recursive: true });
  await writeFile("demo-data/meta.json", JSON.stringify({ recordedAt: new Date().toISOString() }, null, 2));
  const live = log.filter((l) => l.source === "live").length;
  console.log(`\nDone. ${log.length} searches (${live} live). Recordings are in demo-data/.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
