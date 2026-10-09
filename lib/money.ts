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
