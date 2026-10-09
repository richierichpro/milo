import { DEMO_TRIP } from "../lib/demo-trip";
import { formatINR } from "../lib/money";
import { findDestinations } from "../lib/squad";
import type { CallLogEntry } from "../lib/types";

async function main() {
  const log: CallLogEntry[] = [];
  const t = DEMO_TRIP;
  const r = await findDestinations(t.squad, t.startDate, t.endDate, t.budgetPerPerson, { log, onProgress: (x) => console.log("  " + x) });
  if (r.message) console.log(r.message);
  for (const [i, o] of r.options.entries()) {
    console.log(
      `${i + 1}. ${o.destination.name} (${o.destination.airportCode}) ≈ ${formatINR(o.groupTotal / o.perPerson.length)} each · gap ${formatINR(o.fairnessGap)} · ${o.withinBudget}/${o.perPerson.length} within budget · hotel ${o.hotelPerNight ? formatINR(o.hotelPerNight) + "/night" : "?"}`,
    );
    console.log("   " + o.perPerson.map((p) => `${p.person} ${formatINR(p.total)}`).join(" · "));
  }
  console.log(`Searches: ${log.length} (${log.filter((l) => l.source === "live").length} live)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
