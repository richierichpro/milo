import type { CostLine, FlightPick, Hotel } from "./types";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 12345 → "₹12,345" */
export function formatINR(n: number): string {
  return `₹${inr.format(Math.round(n))}`;
}

export const roomsFor = (squadSize: number) => Math.ceil(squadSize / 2);

export function nightsBetween(start: string, end: string): number {
  return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000));
}

export function hotelSharePerPerson(hotel: Hotel | undefined, nights: number, squadSize: number): number {
  if (!hotel?.pricePerNight || squadSize === 0) return 0;
  return (hotel.pricePerNight * nights * roomsFor(squadSize)) / squadSize;
}

export function costSplit(flights: FlightPick[], hotel: Hotel | undefined, nights: number): CostLine[] {
  const share = hotelSharePerPerson(hotel, nights, flights.length);
  return flights.map((f) => {
    const flightCost = (f.out?.pricePerPerson ?? 0) + (f.back?.pricePerPerson ?? 0);
    return { person: f.person, flights: flightCost, hotelShare: Math.round(share), total: Math.round(flightCost + share) };
  });
}

export const averageCost = (costs: CostLine[]) =>
  costs.length ? Math.round(costs.reduce((s, c) => s + c.total, 0) / costs.length) : 0;

export type PriceRange = { min: number; max?: number };

/** Google Maps price text → per-person range: "₹400–1,200", "₹2,000+", "₹200". Anything else → undefined. */
export function parsePriceRange(text?: string): PriceRange | undefined {
  if (!text || !text.includes("₹")) return undefined;
  const nums = (text.match(/\d[\d,]*/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
  if (!nums.length) return undefined;
  if (text.trim().endsWith("+")) return { min: nums[0] };
  return { min: nums[0], max: nums[1] ?? nums[0] };
}

export type ActivityCosts = {
  min: number;
  /** Undefined when any listed price is open-ended ("₹2,000+"). */
  max?: number;
  priced: number;
  stops: number;
};

/** Per-person total of the prices Google lists for the plan's stops. Unlisted stops are counted, not guessed. */
export function activityCosts(prices: (string | undefined)[]): ActivityCosts {
  let min = 0;
  let max: number | undefined = 0;
  let priced = 0;
  for (const p of prices) {
    const r = parsePriceRange(p);
    if (!r) continue;
    priced++;
    min += r.min;
    max = max === undefined || r.max === undefined ? undefined : max + r.max;
  }
  return { min, max, priced, stops: prices.length };
}

/** "₹1,600–3,200" or "₹2,400+" */
export function formatRange(r: { min: number; max?: number }): string {
  if (r.max === undefined) return `${formatINR(r.min)}+`;
  return r.max === r.min ? formatINR(r.min) : `${formatINR(r.min)}–${inr.format(Math.round(r.max))}`;
}
