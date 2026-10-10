// Client-safe display helpers.

/** "2026-11-20" → "Fri 20 Nov" */
export function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).replace(",", "");
}

/** "2026-11-20 14:45" → "14:45" */
export const clock = (t?: string) => t?.slice(11, 16) ?? "–";

/** 75 → "1h 15m" */
export function duration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** "nonstop" or "1 stop via BLR" */
export function stopsLabel(stops: number, via: string[] = []): string {
  if (!stops) return "nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}${via.length ? ` via ${via.join(", ")}` : ""}`;
}

export const DAY_COLORS = ["#0f5257", "#f0a202", "#e0603f", "#6b4c9a", "#2f855a", "#b83280", "#2b6cb0"];

export const initials = (name: string) => name.trim().slice(0, 1).toUpperCase();
