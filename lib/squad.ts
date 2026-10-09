import { airportCoords, primaryCode, resolveAirport } from "./airports";
import { normalizeDestinations, normalizeHotels } from "./normalize";
import * as q from "./queries";
import { serpSearch } from "./serpapi";
import type { CallLogEntry, Destination, DestinationOption, Person, SquadMatch } from "./types";

const TOP = 6;
const MIN_SHARED = 3;
/** Two friends share a room. */
const PEOPLE_PER_ROOM = 2;

function median(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Everyone within budget first, then cheapest overall with a penalty for unfairness. */
function rank(a: DestinationOption, b: DestinationOption, squadSize: number) {
  const allIn = (o: DestinationOption) => (o.withinBudget === squadSize ? 0 : 1);
  return allIn(a) - allIn(b) || a.groupTotal + 0.5 * a.fairnessGap - (b.groupTotal + 0.5 * b.fairnessGap);
}

function buildOption(
  destination: Destination,
  flights: { person: string; city: string; flight: number }[],
  nights: number,
  budget: number | undefined,
  hotelPerNight?: number,
): DestinationOption {
  const hotelShare = hotelPerNight ? Math.round((hotelPerNight * nights) / PEOPLE_PER_ROOM) : 0;
  const perPerson = flights.map((f) => {
    const total = f.flight + hotelShare;
    return { ...f, hotelShare, total, withinBudget: budget ? total <= budget : true };
  });
  const totals = perPerson.map((p) => p.total);
  return {
    destination,
    perPerson,
    hotelPerNight,
    groupTotal: totals.reduce((s, t) => s + t, 0),
    fairnessGap: Math.max(...totals) - Math.min(...totals),
    withinBudget: perPerson.filter((p) => p.withinBudget).length,
  };
}

/**
 * "Where should we go?" One Google Travel Explore search per home city, joined
 * by destination. Travel Explore gives round-trip flight prices but no hotel
 * prices for India, so the top candidates get a real Google Hotels search.
 */
export async function findDestinations(
  squad: Person[],
  startDate: string,
  endDate: string,
  budgetPerPerson: number | undefined,
  opts: { log?: CallLogEntry[]; onProgress?: (text: string) => void } = {},
): Promise<SquadMatch> {
  const homes = squad.map((p) => {
    const a = resolveAirport(p.city);
    if (!a) throw new Error(`Pakka doesn't know the airport for ${p.name}'s city "${p.city}" yet.`);
    const code = primaryCode(a.codes);
    const c = airportCoords(code);
    return { person: p.name, city: p.city, code, lat: c?.[0], lng: c?.[1] };
  });
  const homeCodes = [...new Set(homes.map((h) => h.code))];
  const nights = Math.max(1, Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86_400_000));

  const byHome = new Map(
    await Promise.all(
      homeCodes.map(async (code) => {
        opts.onProgress?.(`Searching Google Travel Explore from ${code}…`);
        const json = await serpSearch(q.exploreParams(code, startDate, endDate), { log: opts.log });
        return [code, new Map(normalizeDestinations(json).map((d) => [d.id, d]))] as const;
      }),
    ),
  );

  // Destinations every home city has a flight price for, excluding anyone's home.
  const first = byHome.get(homeCodes[0])!;
  const shared: DestinationOption[] = [];
  for (const [id, dest] of first) {
    if (dest.airportCode && homeCodes.includes(dest.airportCode)) continue;
    const prices = homes.map((h) => byHome.get(h.code)?.get(id)?.flightPrice);
    if (prices.some((p) => p === undefined)) continue;
    const flights = homes.map((h, i) => ({ person: h.person, city: h.city, flight: prices[i]! }));
    shared.push(buildOption(dest, flights, nights, budgetPerPerson));
  }

  if (shared.length < MIN_SHARED) {
    return {
      options: [],
      homes,
      message: `Google Travel Explore only found ${shared.length} place${shared.length === 1 ? "" : "s"} everyone can fly to on these dates. Type a destination instead and Pakka will plan it.`,
    };
  }

  // Price hotels for the best candidates by flight cost, then re-rank.
  const candidates = shared.sort((a, b) => rank(a, b, squad.length)).slice(0, TOP);
  const priced = await Promise.all(
    candidates.map(async (o) => {
      opts.onProgress?.(`Searching Google Hotels · hotels in ${o.destination.name}…`);
      try {
        const json = await serpSearch(q.hotelParams(o.destination.name, startDate, endDate), { log: opts.log });
        const hotels = normalizeHotels(json).filter((h) => h.pricePerNight);
        const good = hotels.filter((h) => (h.rating ?? 0) >= 4);
        const perNight = median((good.length >= 3 ? good : hotels).map((h) => h.pricePerNight!));
        return buildOption(o.destination, o.perPerson, nights, budgetPerPerson, perNight);
      } catch {
        return o;
      }
    }),
  );

  return { options: priced.sort((a, b) => rank(a, b, squad.length)), homes };
}
