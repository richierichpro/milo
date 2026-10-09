import { callTool, type ToolDef } from "./claude";
import { inTrip, type CandidatePool } from "./gather";
import { costSplit, formatINR, nightsBetween, roomsFor } from "./money";
import type { Day, Event, FlightPick, Hotel, Itinerary, Place, Stop, TripInput } from "./types";

// Claude picks and arranges candidates by id. It never supplies facts: every
// id it returns is looked up in the pool, and unknown ids are removed.

export type DraftStop = { id: string; time: string; why: string };
export type PlanDraft = {
  title: string;
  summary: string;
  hotelId: string;
  days: { date: string; title: string; stops: DraftStop[] }[];
};

export const SUBMIT_ITINERARY: ToolDef = {
  name: "submit_itinerary",
  description: "Submit the trip plan. Every hotelId and stop id must be copied exactly from the candidate list.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "summary", "hotelId", "days"],
    properties: {
      title: { type: "string", description: "Short, fun trip title" },
      summary: { type: "string", description: "Two sentences about the plan" },
      hotelId: { type: "string", description: "id of one hotel from the list" },
      days: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "title", "stops"],
          properties: {
            date: { type: "string", description: "YYYY-MM-DD" },
            title: { type: "string", description: "A few words, e.g. 'North Goa beaches'" },
            stops: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "time", "why"],
                properties: {
                  id: { type: "string", description: "place: or event: id from the list" },
                  time: { type: "string", description: "HH:MM, 24-hour" },
                  why: { type: "string", description: "Why this stop, at most 15 words" },
                },
              },
            },
          },
        },
      },
    },
  },
};

// ---------- Flights ----------

/** Placeholder: each person's cheapest flight each way. Step 6 replaces it. */
export function cheapestFlights(pool: CandidatePool, trip: TripInput): FlightPick[] {
  const cheapest = <T extends { pricePerPerson: number }>(fs: T[] = []) =>
    [...fs].sort((a, b) => a.pricePerPerson - b.pricePerPerson)[0];
  return trip.squad.map((p) => ({
    person: p.name,
    city: p.city,
    out: cheapest(pool.flightsOut[p.name]),
    back: cheapest(pool.flightsBack[p.name]),
  }));
}

const hhmm = (t: string) => t.slice(11, 16);
const addMinutes = (t: string, min: number) => {
  const d = new Date(`${t.replace(" ", "T")}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + min);
  return d.toISOString().slice(0, 16).replace("T", " ");
};

export function togetherWindow(flights: FlightPick[]) {
  const arrivals = flights.map((f) => f.out?.arriveTime).filter((x): x is string => !!x).sort();
  const departures = flights.map((f) => f.back?.departTime).filter((x): x is string => !!x).sort();
  return {
    lastArrival: arrivals.at(-1),
    firstDeparture: departures[0],
    // 1h to get from the airport to the hotel; leave 2.5h before the first flight.
    freeFrom: arrivals.length ? addMinutes(arrivals.at(-1)!, 60) : undefined,
    freeUntil: departures.length ? addMinutes(departures[0], -150) : undefined,
  };
}

// ---------- Prompt ----------

const fmtRating = (r?: number, n?: number) => (r ? `${r}★ (${n ?? 0})` : "no rating");
const fmtLatLng = (lat: number, lng: number) => `@${lat.toFixed(3)},${lng.toFixed(3)}`;

function placeLine(p: Place): string {
  return [p.id, p.name, p.category ?? "place", fmtRating(p.rating, p.reviews), p.priceLevel ?? "-", p.address ?? "-", p.hours ?? "-", fmtLatLng(p.lat, p.lng)].join(" | ");
}
function eventLine(e: Event): string {
  return [e.id, e.title, `event on ${e.date}`, e.dateText ?? "-", e.venue ?? "-", e.address ?? "-"].join(" | ");
}
function hotelLine(h: Hotel): string {
  return [h.id, h.name, h.stars ? `${h.stars}-star` : "hotel", fmtRating(h.rating, h.reviews), `${formatINR(h.pricePerNight ?? 0)}/night`, fmtLatLng(h.lat, h.lng)].join(" | ");
}

export function tripDates(trip: Pick<TripInput, "startDate" | "endDate">): string[] {
  const out: string[] = [];
  for (let d = new Date(`${trip.startDate}T00:00:00Z`); d <= new Date(`${trip.endDate}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function poolPrompt(pool: CandidatePool, trip: TripInput, flights: FlightPick[]): string {
  const w = togetherWindow(flights);
  const nights = nightsBetween(trip.startDate, trip.endDate);
  const rooms = roomsFor(trip.squad.length);
  const flightCost = Math.max(...flights.map((f) => (f.out?.pricePerPerson ?? 0) + (f.back?.pricePerPerson ?? 0)));
  const budgetLine = trip.budgetPerPerson
    ? `Budget ${formatINR(trip.budgetPerPerson)} per person. Flights already cost up to ${formatINR(flightCost)} per person, so the hotel should cost at most about ${formatINR(Math.max(0, ((trip.budgetPerPerson - flightCost) * trip.squad.length) / (rooms * nights)))} per room per night.`
    : "No fixed budget; prefer good value.";
  const events = pool.events.filter((e) => inTrip(e, trip));

  return [
    `Trip: ${trip.squad.length} friends (${trip.squad.map((p) => `${p.name} from ${p.city}`).join(", ")}) to ${trip.destination}, ${trip.startDate} to ${trip.endDate}. ${nights} nights, ${rooms} rooms.`,
    `Interests: ${trip.interests.join(", ") || "anything"}.`,
    budgetLine,
    `Flights: ${flights.map((f) => `${f.person} lands ${f.out ? hhmm(f.out.arriveTime) + " on " + f.out.arriveTime.slice(0, 10) : "?"}, leaves ${f.back ? hhmm(f.back.departTime) + " on " + f.back.departTime.slice(0, 10) : "?"}`).join("; ")}.`,
    `The whole squad is together from ${w.freeFrom ?? "?"} (last person lands ${w.lastArrival ?? "?"}) and must leave for the airport by ${w.freeUntil ?? "?"} (first flight home ${w.firstDeparture ?? "?"}).`,
    `Days to plan: ${tripDates(trip).join(", ")}.`,
    "",
    "HOTELS (id | name | class | rating (reviews) | price | location):",
    ...pool.hotels.map(hotelLine),
    "",
    "PLACES (id | name | category | rating (reviews) | price | address | hours | location):",
    ...pool.places.map(placeLine),
    "",
    events.length ? "EVENTS DURING THE TRIP (id | title | date | when | venue | address):" : "EVENTS: none found during these dates.",
    ...events.map(eventLine),
  ].join("\n");
}

export const PLANNER_SYSTEM = `You are Pakka's trip planner. You arrange a group trip using ONLY the candidates listed by search. You never invent places, hotels, events, prices, ratings or times.

Rules:
- Use only ids copied exactly from the lists. Never make up an id or a place.
- Pick one hotel (hotelId) that fits the budget and has a good rating.
- 3–5 stops on full days, fewer on arrival and departure days.
- Nothing before the squad is together on the first day, nothing after they must leave for the airport on the last day. If the squad lands at night, day 1 can be just dinner or nothing.
- Keep each day's stops close together (use the @lat,lng). Mix sights and food: a meal around lunch and dinner on full days.
- Include an event if one falls on the trip dates and suits the squad.
- Each "why" is at most 15 words, about why it suits this squad. Don't state prices, ratings or hours in it.
- Use each place at most once.`;

// ---------- Grounding ----------

type Lookup = { places: Map<string, Place>; events: Map<string, Event>; hotels: Map<string, Hotel> };

export function lookupFor(pool: CandidatePool): Lookup {
  return {
    places: new Map(pool.places.map((p) => [p.id, p])),
    events: new Map(pool.events.map((e) => [e.id, e])),
    hotels: new Map(pool.hotels.map((h) => [h.id, h])),
  };
}

const clipWords = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(" ");
const validTime = (t: string) => (/^\d{1,2}:\d{2}$/.test(t) ? t.padStart(5, "0") : "12:00");

export type Grounded = {
  hotel?: Hotel;
  days: Day[];
  removed: string[];
  /** Dates of days that lost a stop or ended up empty. */
  daysToFix: string[];
};

/** Look up every id Claude returned. Unknown ids are dropped and reported. */
export function groundDraft(draft: PlanDraft, pool: CandidatePool, trip: TripInput): Grounded {
  const lookup = lookupFor(pool);
  const removed: string[] = [];
  const daysToFix = new Set<string>();
  const seen = new Set<string>();
  const dates = tripDates(trip);

  const hotel = lookup.hotels.get(draft.hotelId);
  if (!hotel) removed.push(draft.hotelId);

  const byDate = new Map(draft.days.map((d) => [d.date, d]));
  const days: Day[] = dates.map((date) => {
    const d = byDate.get(date);
    const stops: Stop[] = [];
    for (const s of d?.stops ?? []) {
      const place = lookup.places.get(s.id);
      const event = lookup.events.get(s.id);
      if ((!place && !event) || seen.has(s.id)) {
        if (!seen.has(s.id)) removed.push(s.id);
        daysToFix.add(date);
        continue;
      }
      seen.add(s.id);
      const base = { time: validTime(s.time), why: clipWords(s.why, 15) };
      stops.push(place ? { kind: "place", ...base, item: place } : { kind: "event", ...base, item: event! });
    }
    stops.sort((a, b) => a.time.localeCompare(b.time));
    // A middle day with nothing on it needs fixing; travel days may be light.
    if (!stops.length && date !== dates[0] && date !== dates.at(-1)) daysToFix.add(date);
    return { date, title: d?.title ?? "Free day", stops };
  });
  for (const d of draft.days) if (!dates.includes(d.date)) daysToFix.add(d.date);

  return { hotel, days, removed, daysToFix: [...daysToFix] };
}

// ---------- Plan ----------

export type PlanOptions = {
  /** Squad flight picker; defaults to the cheapest-each-way placeholder. */
  pickFlights?: (pool: CandidatePool, trip: TripInput) => Pick<Itinerary, "flights" | "arrivalWindow">;
};

export async function planTrip(pool: CandidatePool, trip: TripInput, opts: PlanOptions = {}): Promise<Itinerary> {
  const { flights, arrivalWindow } = opts.pickFlights?.(pool, trip) ?? { flights: cheapestFlights(pool, trip) };
  const prompt = poolPrompt(pool, trip, flights);

  let draft = await callTool<PlanDraft>(PLANNER_SYSTEM, [{ role: "user", content: prompt }], SUBMIT_ITINERARY);
  let grounded = groundDraft(draft, pool, trip);
  const removed = [...grounded.removed];

  if (grounded.removed.length || grounded.daysToFix.length) {
    const fix = `${prompt}\n\nYour previous plan:\n${JSON.stringify(draft)}\n\nProblems: ${
      grounded.removed.length ? `these ids are not in the lists: ${grounded.removed.join(", ")}. ` : ""
    }${grounded.daysToFix.length ? `Fix these days: ${grounded.daysToFix.join(", ")}. ` : ""}Resubmit the full plan, changing only what's needed to fix this.`;
    draft = await callTool<PlanDraft>(PLANNER_SYSTEM, [{ role: "user", content: fix }], SUBMIT_ITINERARY);
    grounded = groundDraft(draft, pool, trip);
    removed.push(...grounded.removed.filter((id) => !removed.includes(id)));
  }

  return assembleItinerary({ draft, grounded, removed, trip, flights, arrivalWindow, pool });
}

export function assembleItinerary(args: {
  draft: PlanDraft;
  grounded: Grounded;
  removed: string[];
  trip: TripInput;
  flights: FlightPick[];
  arrivalWindow?: Itinerary["arrivalWindow"];
  pool: CandidatePool;
}): Itinerary {
  const { draft, grounded, trip, flights } = args;
  // If Claude's hotel wasn't real, fall back to the best-rated real one.
  const hotel =
    grounded.hotel ?? [...args.pool.hotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (a.pricePerNight ?? 0) - (b.pricePerNight ?? 0))[0];
  const nights = nightsBetween(trip.startDate, trip.endDate);
  const lookup = lookupFor(args.pool);
  const flightIds = flights.flatMap((f) => [f.out, f.back]).filter(Boolean);
  const stops = grounded.days.flatMap((d) => d.stops);
  const total = flightIds.length + (hotel ? 1 : 0) + stops.length;
  // Count again against the pool, so the badge is computed, not assumed.
  const verified =
    flightIds.filter((f) => Object.values(args.pool.flightsOut).flat().concat(Object.values(args.pool.flightsBack).flat()).some((x) => x.id === f!.id)).length +
    (hotel && lookup.hotels.has(hotel.id) ? 1 : 0) +
    stops.filter((s) => lookup.places.has(s.item.id) || lookup.events.has(s.item.id)).length;

  return {
    title: draft.title,
    summary: draft.summary,
    trip,
    flights,
    arrivalWindow: args.arrivalWindow,
    hotel,
    rooms: roomsFor(trip.squad.length),
    nights,
    days: grounded.days,
    verification: { total, verified, removed: args.removed },
    costs: costSplit(flights, hotel, nights),
    createdAt: new Date().toISOString(),
  };
}
