import { DAY_COLORS } from "./format";
import type { Itinerary } from "./types";

export type MapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color: string;
  title: string;
  /** Day index for plan stops; undefined for the hotel and Squad Match points. */
  day?: number;
  kind?: "hotel";
};

export type MapLine = { points: [number, number][]; color: string; day?: number; dashed?: boolean };

export function pointsFor(itinerary: Itinerary): MapPoint[] {
  const pts: MapPoint[] = [];
  const h = itinerary.hotel;
  if (h) pts.push({ id: h.id, lat: h.lat, lng: h.lng, label: "🏨", color: "#1d2b2c", title: `Hotel · ${h.name}`, kind: "hotel" });
  itinerary.days.forEach((d, i) =>
    d.stops.forEach((s, j) => {
      if (s.kind === "place") {
        pts.push({ id: s.item.id, lat: s.item.lat, lng: s.item.lng, label: String(j + 1), color: DAY_COLORS[i % DAY_COLORS.length], title: `Day ${i + 1} · ${s.item.name}`, day: i });
      }
    }),
  );
  return pts;
}

/** One line per day through that day's places, in the day's colour. */
export function routesFor(itinerary: Itinerary): MapLine[] {
  return itinerary.days
    .map((d, i) => ({
      day: i,
      color: DAY_COLORS[i % DAY_COLORS.length],
      points: d.stops.filter((s) => s.kind === "place").map((s) => [s.item.lat, s.item.lng] as [number, number]),
    }))
    .filter((r) => r.points.length > 1);
}
