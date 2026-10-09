import { DAY_COLORS } from "./format";
import type { Itinerary } from "./types";

export type MapPoint = { id: string; lat: number; lng: number; label: string; color: string; title: string };

export function pointsFor(itinerary: Itinerary): MapPoint[] {
  const pts: MapPoint[] = [];
  const h = itinerary.hotel;
  if (h) pts.push({ id: h.id, lat: h.lat, lng: h.lng, label: "🏨", color: "#1d2b2c", title: h.name });
  itinerary.days.forEach((d, i) =>
    d.stops.forEach((s, j) => {
      if (s.kind === "place") {
        pts.push({ id: s.item.id, lat: s.item.lat, lng: s.item.lng, label: String(j + 1), color: DAY_COLORS[i % DAY_COLORS.length], title: `Day ${i + 1} · ${s.item.name}` });
      }
    }),
  );
  return pts;
}
