"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { MapLine, MapPoint } from "@/lib/map-points";

const NO_LINES: MapLine[] = [];

export default function TripMap({
  points,
  lines = NO_LINES,
  selectedId,
  activeDay,
  onSelect,
}: {
  points: MapPoint[];
  /** Day routes, or lines from each friend's city to a destination. */
  lines?: MapLine[];
  selectedId?: string;
  /** When set, that day's markers and route stand out and the rest fade. */
  activeDay?: number;
  onSelect?: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const routes = useRef<{ line: L.Polyline; day?: number }[]>([]);
  const bounds = useRef<L.LatLngBounds | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, scrollWheelZoom: true }).setView([20.6, 78.9], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    // The container can change size after first paint (fonts, layout); keep the plan in view.
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      if (bounds.current) m.fitBounds(bounds.current, { padding: [30, 30], maxZoom: 13 });
    });
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    markers.current.clear();
    routes.current = lines.map((l) => ({
      day: l.day,
      line: L.polyline(l.points, { color: l.color, weight: l.dashed ? 2 : 3, opacity: 0.75, dashArray: l.dashed ? "6 6" : undefined }).addTo(g),
    }));
    for (const p of points) {
      const icon =
        p.kind === "hotel"
          ? L.divIcon({ className: "", html: `<div class="pin-hotel">🏨</div>`, iconSize: [34, 34], iconAnchor: [17, 17] })
          : L.divIcon({ className: "", html: `<div class="pin" style="background:${p.color}">${p.label}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      const marker = L.marker([p.lat, p.lng], { icon, title: p.title, zIndexOffset: p.kind === "hotel" ? 1000 : 0 }).addTo(g).bindTooltip(p.title);
      marker.on("click", () => onSelect?.(p.id));
      markers.current.set(p.id, marker);
    }
    const all: [number, number][] = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...lines.flatMap((l) => l.points)];
    bounds.current = all.length ? L.latLngBounds(all) : null;
    if (bounds.current) m.fitBounds(bounds.current, { padding: [30, 30], maxZoom: 13 });
  }, [points, lines, onSelect]);

  // Highlight one day: its markers and route stay bright, everything else fades.
  useEffect(() => {
    const dayOf = new Map(points.map((p) => [p.id, p.day]));
    for (const [id, marker] of markers.current) {
      const d = dayOf.get(id);
      marker.setOpacity(activeDay === undefined || d === undefined || d === activeDay ? 1 : 0.25);
    }
    for (const r of routes.current) r.line.setStyle({ opacity: activeDay === undefined || r.day === activeDay ? 0.75 : 0.1 });
    const m = map.current;
    if (m && activeDay !== undefined) {
      const pts = points.filter((p) => p.day === activeDay).map((p) => [p.lat, p.lng] as [number, number]);
      if (pts.length) m.flyToBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 14, duration: 0.8 });
    }
  }, [activeDay, points, lines]);

  useEffect(() => {
    const marker = selectedId ? markers.current.get(selectedId) : undefined;
    if (marker && map.current) {
      map.current.flyTo(marker.getLatLng(), Math.max(map.current.getZoom(), 14), { duration: 0.8 });
      marker.openTooltip();
    }
  }, [selectedId]);

  return <div ref={el} className="h-full w-full" />;
}
