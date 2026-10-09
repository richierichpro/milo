// Client-safe display helpers.

const ENGINE_LABELS: Record<string, string> = {
  google_maps: "Google Maps",
  google_hotels: "Google Hotels",
  google_flights: "Google Flights",
  google: "Google Events",
  google_travel_explore: "Google Travel Explore",
};

export const engineLabel = (engine: string) => ENGINE_LABELS[engine] ?? engine;

export function timeAgo(iso: string, now: number): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** "2026-11-20" → "Fri 20 Nov" */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
}

/** "2026-11-20 14:45" → "14:45" */
export const clock = (t?: string) => t?.slice(11, 16) ?? "–";

export const DAY_COLORS = ["#0f5257", "#f0a202", "#e0603f", "#6b4c9a", "#2f855a", "#b83280", "#2b6cb0"];

export const initials = (name: string) => name.trim().slice(0, 1).toUpperCase();
