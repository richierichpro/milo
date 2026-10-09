/* eslint-disable @typescript-eslint/no-explicit-any -- raw SerpApi JSON is parsed here */
import { resolveAirport } from "./airports";
import { selectFlightOptions } from "./land-together";
import { normalizeEvents, normalizeFlights, normalizeHotels, normalizePlaces } from "./normalize";
import * as q from "./queries";
import { serpSearch, type SerpParams } from "./serpapi";
import type { CallLogEntry, Event, Flight, Hotel, Place, TripInput } from "./types";

export type CandidatePool = {
  flightsOut: Record<string, Flight[]>;
  flightsBack: Record<string, Flight[]>;
  hotels: Hotel[];
  places: Place[];
  events: Event[];
  receipts: CallLogEntry[];
  errors: string[];
};

const KEEP = { hotels: 12, placesPerQuery: 10, events: 8, interests: 3 };

export async function gatherCandidates(input: TripInput, onProgress?: (text: string) => void): Promise<CandidatePool> {
  const receipts: CallLogEntry[] = [];
  const errors: string[] = [];
  const dest = input.destination.trim();
  // Our own lookup first (it knows Goa has two airports); Squad Match's code otherwise.
  const destAirport = resolveAirport(dest) ?? (input.destinationAirport ? { codes: input.destinationAirport } : null);
  if (!destAirport) throw new Error(`Pakka doesn't know the airport for "${dest}" yet.`);

  const run = async <T>(label: string, params: SerpParams, parse: (json: any) => T, empty: T): Promise<T> => {
    onProgress?.(`Searching ${label}…`);
    try {
      return parse(await serpSearch(params, { log: receipts }));
    } catch (err) {
      errors.push(`${label}: ${(err as Error).message}`);
      return empty;
    }
  };

  // One flight search per unique home airport and direction.
  const homeCodes = new Map<string, string>();
  for (const p of input.squad) {
    const home = resolveAirport(p.city);
    if (!home) errors.push(`No airport known for ${p.name}'s city "${p.city}"`);
    else homeCodes.set(p.name, home.codes);
  }
  const uniqueHomes = [...new Set(homeCodes.values())];
  const flightSearch = (from: string, to: string, date: string) =>
    run(`Google Flights ${from} → ${to}`, q.flightParams(from, to, date), (j) => selectFlightOptions(normalizeFlights(j)), []);

  const byHome = (to: (home: string) => [string, string], date: string) =>
    Promise.all(uniqueHomes.map(async (h) => [h, await flightSearch(...to(h), date)] as const)).then(
      (pairs) => Object.fromEntries(pairs) as Record<string, Flight[]>,
    );

  const [outByHome, backByHome, hotels, placeLists, events] = await Promise.all([
    byHome((h) => [h, destAirport.codes], input.startDate),
    byHome((h) => [destAirport.codes, h], input.endDate),
    run(
      `Google Hotels · hotels in ${dest}`,
      q.hotelParams(dest, input.startDate, input.endDate),
      (j) => normalizeHotels(j).filter((h) => h.pricePerNight !== undefined).slice(0, KEEP.hotels),
      [] as Hotel[],
    ),
    Promise.all(
      [
        `top attractions in ${dest}`,
        `best restaurants in ${dest}`,
        `best cafes in ${dest}`,
        ...input.interests.slice(0, KEEP.interests).map((i) => `best ${i} in ${dest}`),
      ].map((query) =>
        run(`Google Maps · ${query}`, q.mapsParams(query), (j) => normalizePlaces(j).slice(0, KEEP.placesPerQuery), [] as Place[]),
      ),
    ),
    run(
      `Google Events · ${q.eventsQuery(dest)}`,
      q.eventsParams(q.eventsQuery(dest)),
      (j) => sortEventsForTrip(normalizeEvents(j, Number(input.startDate.slice(0, 4))), input).slice(0, KEEP.events),
      [] as Event[],
    ),
  ]);

  const flightsOut: Record<string, Flight[]> = {};
  const flightsBack: Record<string, Flight[]> = {};
  for (const [name, home] of homeCodes) {
    flightsOut[name] = outByHome[home] ?? [];
    flightsBack[name] = backByHome[home] ?? [];
  }
  const places = [...new Map(placeLists.flat().map((p) => [p.id, p])).values()];

  return { flightsOut, flightsBack, hotels, places, events, receipts, errors };
}

export const inTrip = (e: Event, trip: Pick<TripInput, "startDate" | "endDate">) =>
  !!e.date && e.date >= trip.startDate && e.date <= trip.endDate;

/** Events during the trip first, then the rest. */
function sortEventsForTrip(events: Event[], trip: TripInput): Event[] {
  return [...events].sort((a, b) => Number(inTrip(b, trip)) - Number(inTrip(a, trip)));
}
