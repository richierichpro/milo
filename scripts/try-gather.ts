import { resolveAirport } from "../lib/airports";
import { gatherCandidates } from "../lib/gather";
import { DEMO_TRIP } from "../lib/demo-trip";

async function main() {
  const pool = await gatherCandidates(DEMO_TRIP, (t) => console.log("  " + t));
  console.log("\nFlights out:", Object.entries(pool.flightsOut).map(([n, f]) => `${n} ${f.length}`).join(", "));
  console.log("Flights back:", Object.entries(pool.flightsBack).map(([n, f]) => `${n} ${f.length}`).join(", "));
  console.log(`Hotels ${pool.hotels.length} · Places ${pool.places.length} · Events ${pool.events.length}`);
  const live = pool.receipts.filter((r) => r.source === "live").length;
  console.log(`Searches: ${pool.receipts.length} (${live} live, ${pool.receipts.length - live} cache/demo)`);
  if (pool.errors.length) console.log("Errors:", pool.errors);
  console.log("manali →", resolveAirport("manali"), "| 'Munnar ' →", resolveAirport("Munnar "));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
