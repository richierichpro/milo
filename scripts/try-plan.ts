import { mkdir, writeFile } from "node:fs/promises";
import { DEMO_TRIP } from "../lib/demo-trip";
import { gatherCandidates } from "../lib/gather";
import { averageCost, formatINR } from "../lib/money";
import { planTrip } from "../lib/planner";

async function main() {
  const pool = await gatherCandidates(DEMO_TRIP);
  const live = pool.receipts.filter((r) => r.source === "live").length;
  console.log(`Gathered (${pool.receipts.length} searches, ${live} live). Asking Claude…`);
  const it = await planTrip(pool, DEMO_TRIP);
  // Saved so later steps can reuse this plan without another Claude call.
  await mkdir(".cache", { recursive: true });
  await writeFile(".cache/last-plan.json", JSON.stringify({ itinerary: it, pool }));

  console.log(`\n${it.title}\n${it.summary}\n`);
  for (const f of it.flights)
    console.log(`✈ ${f.person}: ${f.out?.from}→${f.out?.to} ${f.out?.departTime}→${f.out?.arriveTime.slice(11)} | back ${f.back?.departTime} (${formatINR((f.out?.pricePerPerson ?? 0) + (f.back?.pricePerPerson ?? 0))})`);
  console.log(`🏨 ${it.hotel?.name} · ${formatINR(it.hotel?.pricePerNight ?? 0)}/night × ${it.nights} nights × ${it.rooms} rooms`);
  it.days.forEach((d, i) => {
    console.log(`\nDay ${i + 1} · ${d.date} · ${d.title}`);
    for (const s of d.stops) console.log(`  ${s.time}  ${s.kind === "place" ? s.item.name : s.item.title}  — ${s.why}`);
  });
  const v = it.verification;
  console.log(`\nVerified ${v.verified}/${v.total} items against live search${v.removed.length ? ` · removed: ${v.removed.join(", ")}` : ""}`);
  for (const c of it.costs) console.log(`  ${c.person}: flights ${formatINR(c.flights)} + hotel ${formatINR(c.hotelShare)} = ${formatINR(c.total)}`);
  console.log(`Average ${formatINR(averageCost(it.costs))} per person`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
