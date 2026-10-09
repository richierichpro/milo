import { mkdir, writeFile } from "node:fs/promises";
import { DEMO_TRIP } from "../lib/demo-trip";
import { gatherCandidates } from "../lib/gather";
import { activityCosts, averageCost, formatINR, formatRange, stopPrice } from "../lib/money";
import { duration, stopsLabel } from "../lib/format";
import { airportSplitNote, pickSquadFlights } from "../lib/land-together";
import { planTrip } from "../lib/planner";

async function main() {
  const pool = await gatherCandidates(DEMO_TRIP);
  const live = pool.receipts.filter((r) => r.source === "live").length;
  console.log(`Gathered (${pool.receipts.length} searches, ${live} live). Asking Claude…`);
  const it = await planTrip(pool, DEMO_TRIP, { pickFlights: (p, t) => pickSquadFlights(p.flightsOut, p.flightsBack, t.squad) });
  // Saved so later steps can reuse this plan without another Claude call.
  await mkdir(".cache", { recursive: true });
  await writeFile(".cache/last-plan.json", JSON.stringify({ itinerary: it, pool }));

  console.log(`\n${it.title}\n${it.summary}\n`);
  for (const f of it.flights)
    console.log(
      `✈ ${f.person}: ${f.out?.from}→${f.out?.to} ${f.out?.departTime.slice(11)}→${f.out?.arriveTime.slice(11)} (${duration(f.out?.durationMin ?? 0)} · ${stopsLabel(f.out?.stops ?? 0, f.out?.via)}) | back ${f.back?.from} ${f.back?.departTime.slice(11)} (${duration(f.back?.durationMin ?? 0)} · ${stopsLabel(f.back?.stops ?? 0, f.back?.via)}) · ${formatINR((f.out?.pricePerPerson ?? 0) + (f.back?.pricePerPerson ?? 0))}`,
    );
  for (const d of ["out", "back"] as const) {
    const note = airportSplitNote(it.flights, d);
    if (note) console.log(`⚠ ${note}`);
  }
  if (it.arrivalWindow) console.log(`Everyone lands between ${it.arrivalWindow.first.slice(11)} and ${it.arrivalWindow.last.slice(11)} · ${formatINR(it.arrivalWindow.extraVsCheapest)} more than the cheapest scattered flights`);
  console.log(`🏨 ${it.hotel?.name} · ${formatINR(it.hotel?.pricePerNight ?? 0)}/night × ${it.nights} nights × ${it.rooms} rooms · ≈ ${it.hotelDistanceKm?.toFixed(1)} km from most of the plan`);
  it.days.forEach((d, i) => {
    console.log(`\nDay ${i + 1} · ${d.date} · ${d.title}${d.approxKm !== undefined ? ` · ≈ ${d.approxKm} km` : ""}`);
    for (const s of d.stops) {
      const r = stopPrice(s);
      const tour = s.kind === "place" ? s.item.prices?.tours[0] : undefined;
      console.log(`  ${s.time}  ${s.kind === "place" ? s.item.name : s.item.title}${r ? ` [${formatRange(r)}]` : ""}${tour ? ` (tours from ${tour.priceText})` : ""}  — ${s.why}`);
    }
  });
  const v = it.verification;
  console.log(`\nVerified ${v.verified}/${v.total} items against live search${v.removed.length ? ` · removed: ${v.removed.join(", ")}` : ""}`);
  for (const c of it.costs) console.log(`  ${c.person}: flights ${formatINR(c.flights)} + hotel ${formatINR(c.hotelShare)} = ${formatINR(c.total)}`);
  console.log(`Average ${formatINR(averageCost(it.costs))} per person`);
  const acts = activityCosts(it.days.flatMap((d) => d.stops).map(stopPrice));
  console.log(`Food & activities where Google lists a price: ${acts.priced ? formatRange(acts) : "-"} each (${acts.priced} of ${acts.stops} stops)`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
