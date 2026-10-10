import { readFile } from "node:fs/promises";
import { editPlan } from "../lib/agent";
import type { CandidatePool } from "../lib/gather";
import type { Itinerary } from "../lib/types";

// Uses the plan saved by `npm run try:plan`.
async function main() {
  const request = process.argv[2] ?? "Kabir can't leave Delhi before 6pm Friday";
  const { itinerary, pool } = JSON.parse(await readFile(".cache/last-plan.json", "utf8")) as { itinerary: Itinerary; pool: CandidatePool };
  const before = itinerary.flights.find((f) => f.person === "Kabir");
  console.log(`Before: Kabir departs ${before?.out?.departTime}\nRequest: ${request}`);
  const r = await editPlan(itinerary, pool, request, (t) => console.log("  " + t));
  const it = r.itinerary;
  for (const f of it.flights) console.log(`  ✈ ${f.person}: ${f.out?.from} ${f.out?.departTime} → ${f.out?.arriveTime.slice(11)}`);
  if (it.arrivalWindow) console.log(`  lands ${it.arrivalWindow.first.slice(11)}–${it.arrivalWindow.last.slice(11)}`);
  console.log(`  Day 1: ${it.days[0].stops.map((s) => `${s.time} ${s.kind === "place" ? s.item.name : s.item.title}`).join(" · ") || "(nothing)"}`);
  console.log(`  Hotel: ${it.hotel?.name}`);
  console.log(`Verified ${it.verification.verified}/${it.verification.total}${it.verification.removed.length ? ` · removed ${it.verification.removed.join(", ")}` : ""}`);
  console.log(`Milo: ${r.text}`);
  console.log(`Searches: ${r.receipts.length} (${r.receipts.filter((x) => x.source === "live").length} live)`);
  const kabir = it.flights.find((f) => f.person === "Kabir")?.out;
  if (request.startsWith("Kabir")) console.log(kabir && kabir.departTime.slice(11) >= "18:00" ? "PASS: Kabir departs after 18:00" : "FAIL: Kabir still departs before 18:00");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
