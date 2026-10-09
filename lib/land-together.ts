import type { Flight, FlightPick, Itinerary, Person } from "./types";

/** ₹ added to a combination's score for every 10 minutes between the first and last arrival (or departure). */
export const SPREAD_PENALTY_PER_10_MIN = 300;
/** Upper bound on combinations tried per direction. */
export const MAX_COMBOS = 50_000;
/** Options per person considered. */
export const MAX_OPTIONS = 8;

const minutes = (t: string) => Date.parse(`${t.replace(" ", "T")}:00Z`) / 60_000;

type Combo = { flights: Flight[]; price: number; spreadMin: number; score: number };

/** Score every combination of one flight per person; return the best and the cheapest. */
function bestCombo(options: Flight[][], timeOf: (f: Flight) => string): { best?: Combo; cheapest?: Combo } {
  if (!options.length || options.some((o) => !o.length)) return {};
  // Keep each person's cheapest options, shrinking until the product fits.
  let k = MAX_OPTIONS;
  while (k > 1 && options.reduce((n, o) => n * Math.min(o.length, k), 1) > MAX_COMBOS) k--;
  const lists = options.map((o) => [...o].sort((a, b) => a.pricePerPerson - b.pricePerPerson).slice(0, k));

  let best: Combo | undefined;
  let cheapest: Combo | undefined;
  const idx = lists.map(() => 0);
  for (;;) {
    const flights = lists.map((l, i) => l[idx[i]]);
    const times = flights.map((f) => minutes(timeOf(f)));
    const spreadMin = Math.max(...times) - Math.min(...times);
    const price = flights.reduce((s, f) => s + f.pricePerPerson, 0);
    const score = price + (spreadMin / 10) * SPREAD_PENALTY_PER_10_MIN;
    if (!best || score < best.score) best = { flights, price, spreadMin, score };
    if (!cheapest || price < cheapest.price) cheapest = { flights, price, spreadMin, score };
    // Next combination (odometer).
    let i = 0;
    while (i < idx.length && ++idx[i] === lists[i].length) idx[i++] = 0;
    if (i === idx.length) break;
  }
  return { best, cheapest };
}

export type SquadFlights = Pick<Itinerary, "flights" | "arrivalWindow"> & {
  departureWindow?: { first: string; last: string };
  cheapestTotal: number;
  bestTotal: number;
};

/**
 * "Land together": the flights for everyone that keep arrivals (and return
 * departures) close while staying cheap.
 */
export function pickSquadFlights(flightsOut: Record<string, Flight[]>, flightsBack: Record<string, Flight[]>, squad: Person[]): SquadFlights {
  // Anyone whose search failed is left out of the optimisation (their card says "couldn't check this").
  const withOut = squad.filter((p) => flightsOut[p.name]?.length);
  const withBack = squad.filter((p) => flightsBack[p.name]?.length);
  const out = bestCombo(withOut.map((p) => flightsOut[p.name]), (f) => f.arriveTime);
  const back = bestCombo(withBack.map((p) => flightsBack[p.name]), (f) => f.departTime);
  const pickFor = (people: Person[], combo: Combo | undefined, name: string) => combo?.flights[people.findIndex((p) => p.name === name)];

  const flights: FlightPick[] = squad.map((p) => ({
    person: p.name,
    city: p.city,
    out: pickFor(withOut, out.best, p.name),
    back: pickFor(withBack, back.best, p.name),
  }));
  const bestTotal = (out.best?.price ?? 0) + (back.best?.price ?? 0);
  const cheapestTotal = (out.cheapest?.price ?? 0) + (back.cheapest?.price ?? 0);
  const window = (fs: Flight[] | undefined, timeOf: (f: Flight) => string) => {
    if (!fs?.length) return undefined;
    const ts = fs.map(timeOf).sort();
    return { first: ts[0], last: ts[ts.length - 1] };
  };
  const arr = window(out.best?.flights, (f) => f.arriveTime);

  return {
    flights,
    arrivalWindow: arr ? { ...arr, extraVsCheapest: bestTotal - cheapestTotal } : undefined,
    departureWindow: window(back.best?.flights, (f) => f.departTime),
    cheapestTotal,
    bestTotal,
  };
}
