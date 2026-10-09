import { clock, dayLabel } from "./format";
import { activityCosts, averageCost, formatINR, formatRange } from "./money";
import type { Itinerary } from "./types";

/** A plain-text plan to paste into the group chat. */
export function whatsappText(it: Itinerary): string {
  const { trip } = it;
  const lines = [
    `*${it.title}* 🌴`,
    `${trip.destination} · ${dayLabel(trip.startDate)} – ${dayLabel(trip.endDate)}`,
    "",
    "*Flights*",
    ...it.flights.map(
      (f) =>
        `• ${f.person}: ${f.out ? `${f.out.from} ${clock(f.out.departTime)} → ${f.out.to} ${clock(f.out.arriveTime)} (${f.out.flightNumbers.join("/")})` : "?"}` +
        ` · back ${f.back ? `${clock(f.back.departTime)} (${f.back.flightNumbers.join("/")})` : "?"}`,
    ),
  ];
  if (it.arrivalWindow) lines.push(`Everyone lands between ${clock(it.arrivalWindow.first)} and ${clock(it.arrivalWindow.last)} ✈️`);
  if (it.hotel) lines.push("", "*Stay*", `${it.hotel.name}${it.hotel.pricePerNight ? ` · ${formatINR(it.hotel.pricePerNight)}/night` : ""} · ${it.rooms} rooms`);
  lines.push("", "*Cost per person*", ...it.costs.map((c) => `• ${c.person}: ${formatINR(c.total)}`), `Average ${formatINR(averageCost(it.costs))} (flights + hotel)`);
  const acts = activityCosts(it.days.flatMap((d) => d.stops).map((s) => (s.kind === "place" ? s.item.priceLevel : undefined)));
  if (acts.priced) lines.push(`+ food & activities ${formatRange(acts)} each where Google lists a price (${acts.priced} of ${acts.stops} stops)`);
  lines.push("", "*Plan*");
  it.days.forEach((d, i) => {
    const top = d.stops[0];
    lines.push(`Day ${i + 1} (${dayLabel(d.date)}): ${d.title}${top ? ` — starts with ${top.kind === "place" ? top.item.name : top.item.title} at ${top.time}` : ""}`);
  });
  lines.push("", "Pakka? 🔥 (prices from Google search, checked just now)");
  return lines.join("\n");
}
