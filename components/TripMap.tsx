"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { MapPoint } from "@/lib/map-points";

export default function TripMap({
  points,
  lines = [],
  selectedId,
  onSelect,
}: {
  points: MapPoint[];
  /** Polylines, e.g. from each friend's city to a destination. */
  lines?: { from: [number, number]; to: [number, number]; color: string }[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true, scrollWheelZoom: true }).setView([20.6, 78.9], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    const m = map.current;
    const ro = new ResizeObserver(() => m.invalidateSize());
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
    for (const l of lines) L.polyline([l.from, l.to], { color: l.color, weight: 2, opacity: 0.7, dashArray: "6 6" }).addTo(g);
    for (const p of points) {
      const icon = L.divIcon({ className: "", html: `<div class="pin" style="background:${p.color}">${p.label}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      const marker = L.marker([p.lat, p.lng], { icon, title: p.title }).addTo(g).bindTooltip(p.title);
      marker.on("click", () => onSelect?.(p.id));
      markers.current.set(p.id, marker);
    }
    const all: L.LatLngExpression[] = [...points.map((p) => [p.lat, p.lng] as [number, number]), ...lines.flatMap((l) => [l.from, l.to])];
    if (all.length) m.fitBounds(L.latLngBounds(all), { padding: [30, 30], maxZoom: 13 });
  }, [points, lines, onSelect]);

  useEffect(() => {
    const marker = selectedId ? markers.current.get(selectedId) : undefined;
    if (marker && map.current) {
      map.current.flyTo(marker.getLatLng(), Math.max(map.current.getZoom(), 14), { duration: 0.8 });
      marker.openTooltip();
    }
  }, [selectedId]);

  return <div ref={el} className="h-full w-full" />;
}
