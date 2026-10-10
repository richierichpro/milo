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
  playKey = 0,
  onSelect,
}: {
  points: MapPoint[];
  /** Day routes, or lines from each friend's city to a destination. */
  lines?: MapLine[];
  selectedId?: string;
  /** When set, that day's markers and route stand out and the rest fade. */
  activeDay?: number;
  /** Changes every time a day is clicked, so clicking the same day replays its route. */
  playKey?: number;
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
    // Zoom buttons bottom-right, so the day buttons can sit along the top.
    map.current = L.map(el.current, { zoomControl: false, scrollWheelZoom: true }).setView([20.6, 78.9], 5);
    L.control.zoom({ position: "bottomright" }).addTo(map.current);
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

  // Highlight one day: its markers stay bright, everything else fades, and the
  // day's route is drawn stop by stop with a 🛺 moving along it.
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    const dayOf = new Map(points.map((p) => [p.id, p.day]));
    for (const [id, marker] of markers.current) {
      const d = dayOf.get(id);
      marker.setOpacity(activeDay === undefined || d === undefined || d === activeDay ? 1 : 0.25);
      marker.closeTooltip();
    }
    for (const r of routes.current) r.line.setStyle({ opacity: activeDay === undefined ? 0.75 : r.day === activeDay ? 0 : 0.1 });
    if (!m || !g || activeDay === undefined) return;

    const stops = points.filter((p) => p.day === activeDay);
    if (!stops.length) return;
    m.flyToBounds(L.latLngBounds(stops.map((p) => [p.lat, p.lng] as [number, number])), { padding: [50, 50], maxZoom: 14, duration: 0.8 });

    const color = stops[0].color;
    const trail = L.polyline([[stops[0].lat, stops[0].lng]], { color, weight: 4, opacity: 0.9 }).addTo(g);
    const mover = L.marker([stops[0].lat, stops[0].lng], {
      icon: L.divIcon({ className: "", html: `<div class="mover">🛺</div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
      zIndexOffset: 2000,
      interactive: false,
    }).addTo(g);
    const arrive = (i: number) => markers.current.get(stops[i].id)?.openTooltip();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let timer: number | undefined;
    if (reduced) {
      trail.setLatLngs(stops.map((p) => [p.lat, p.lng]));
      mover.setLatLng([stops.at(-1)!.lat, stops.at(-1)!.lng]);
    } else {
      // Start once the map has flown to the day.
      timer = window.setTimeout(() => {
        arrive(0);
        let leg = 0;
        let legStart = performance.now();
        const legMs = (a: MapPoint, b: MapPoint) => Math.min(2200, Math.max(900, m.distance([a.lat, a.lng], [b.lat, b.lng]) / 4));
        const step = (now: number) => {
          if (leg >= stops.length - 1) return;
          const a = stops[leg];
          const b = stops[leg + 1];
          const t = Math.min(1, (now - legStart) / legMs(a, b));
          const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          const pos: [number, number] = [a.lat + (b.lat - a.lat) * ease, a.lng + (b.lng - a.lng) * ease];
          mover.setLatLng(pos);
          trail.setLatLngs([...stops.slice(0, leg + 1).map((p) => [p.lat, p.lng] as [number, number]), pos]);
          if (t >= 1) {
            markers.current.get(a.id)?.closeTooltip();
            arrive(leg + 1);
            leg++;
            legStart = now + 350; // a short pause at each stop
          }
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      }, 850);
    }
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      trail.remove();
      mover.remove();
    };
  }, [activeDay, playKey, points, lines]);

  useEffect(() => {
    const marker = selectedId ? markers.current.get(selectedId) : undefined;
    if (marker && map.current) {
      map.current.flyTo(marker.getLatLng(), Math.max(map.current.getZoom(), 14), { duration: 0.8 });
      marker.openTooltip();
    }
  }, [selectedId]);

  return <div ref={el} className="h-full w-full" />;
}
