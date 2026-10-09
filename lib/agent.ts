import type Anthropic from "@anthropic-ai/sdk";
import { primaryCode, resolveAirport } from "./airports";
import { createMessage, type ToolDef } from "./claude";
import { inTrip, type CandidatePool } from "./gather";
import { pickSquadFlights, selectFlightOptions } from "./land-together";
import { averageCost, formatINR } from "./money";
import { normalizeEvents, normalizeFlights, normalizeHotels, normalizePlaces } from "./normalize";
import {
  alias,
  assembleItinerary,
  cheapestFlights,
  groundDraft,
  PLANNER_SYSTEM,
  poolPrompt,
  sanitizeText,
  SUBMIT_ITINERARY,
  type PlanDraft,
} from "./planner";
import * as q from "./queries";
import { serpSearch } from "./serpapi";
import type { CallLogEntry, Flight, Itinerary } from "./types";

const MAX_ROUNDS = 6;

type EditDraft = PlanDraft & { flightMode: "together" | "cheapest"; priceFirst: string[]; changeNote: string };

const SUBMIT_EDIT: ToolDef = {
  ...SUBMIT_ITINERARY,
  description: "Submit the full updated plan. This ends the edit.",
  input_schema: {
    ...SUBMIT_ITINERARY.input_schema,
    required: [...(SUBMIT_ITINERARY.input_schema.required ?? []), "flightMode", "priceFirst", "changeNote"],
    properties: {
      ...(SUBMIT_ITINERARY.input_schema.properties as Record<string, unknown>),
      flightMode: {
        type: "string",
        enum: ["together", "cheapest"],
        description: "together = flights chosen so everyone lands close together (default); cheapest = each person's cheapest flights",
      },
      priceFirst: {
        type: "array",
        items: { type: "string" },
        description: "Travellers who should get their cheapest flights even if they land apart from the others (e.g. when asked to find someone cheaper flights). Empty otherwise.",
      },
      changeNote: { type: "string", description: "1–2 sentences on what changed. No numbers or prices; the app adds them." },
    },
  },
};

const TOOLS: ToolDef[] = [
  {
    name: "search_places",
    description: "Search Google Maps for places at the destination, e.g. 'sunset cruise', 'trekking', 'seafood shacks in Palolem'.",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string" } } },
  },
  {
    name: "search_hotels",
    description: "Search Google Hotels at the destination for the trip dates (prices are per room per night, 2 adults).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        maxPricePerNight: { type: "integer", description: "₹ per room per night" },
        minRating: { type: "number", enum: [3.5, 4, 4.5] },
        sortBy: { type: "string", enum: ["price", "rating"] },
      },
    },
  },
  {
    name: "search_flights",
    description: "Search Google Flights for one traveller's leg. The results replace that traveller's flight options.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["traveller", "direction"],
      properties: {
        traveller: { type: "string", description: "Name as in the squad" },
        direction: { type: "string", enum: ["out", "back"] },
        departAfter: { type: "integer", description: "Earliest departure hour, 0–23" },
        departBefore: { type: "integer", description: "Latest departure hour, 1–23" },
        nonstopOnly: { type: "boolean" },
      },
    },
  },
  {
    name: "search_events",
    description: "Search Google for events, e.g. 'concerts in Goa'. Only events dated during the trip can be used.",
    input_schema: { type: "object", additionalProperties: false, required: ["query"], properties: { query: { type: "string" } } },
  },
  SUBMIT_EDIT,
];

const EDIT_SYSTEM = `${PLANNER_SYSTEM}

You are editing an existing plan for the squad.
- Change only what the user asked for; keep everything else as it is.
- If you need something that isn't in the lists, search for it first. Search results are added to the lists with new ids.
- To change someone's flights, use search_flights. The app then re-picks everyone's flights so the squad still lands together.
- To make someone's flights cheaper, list them in priceFirst; they get their cheapest flights and the others re-sync around them.
- Finish by calling submit_itinerary with the full updated plan.`;

/** The current plan in Claude's short-id format. */
function currentDraft(it: Itinerary, pool: CandidatePool) {
  const idx = <T extends { id: string }>(list: T[], id: string, short: (i: number) => string) => {
    const i = list.findIndex((x) => x.id === id);
    return i >= 0 ? short(i) : id;
  };
  return {
    title: it.title,
    hotelId: it.hotel ? idx(pool.hotels, it.hotel.id, alias.hotel) : "",
    days: it.days.map((d) => ({
      date: d.date,
      title: d.title,
      stops: d.stops.map((s) => ({
        id: s.kind === "place" ? idx(pool.places, s.item.id, alias.place) : idx(pool.events, s.item.id, alias.event),
        time: s.time,
        why: s.why,
      })),
    })),
  };
}

const appendNew = <T extends { id: string }>(list: T[], items: T[]) => {
  const seen = new Set(list.map((x) => x.id));
  const added = items.filter((x) => !seen.has(x.id));
  list.push(...added);
  return added;
};

export type EditResult = { itinerary: Itinerary; pool: CandidatePool; receipts: CallLogEntry[]; text: string };

export async function editPlan(
  itinerary: Itinerary,
  startPool: CandidatePool,
  request: string,
  onProgress: (text: string) => void,
): Promise<EditResult> {
  // Copy so a failed edit leaves the caller's pool untouched.
  const pool: CandidatePool = structuredClone(startPool);
  const trip = itinerary.trip;
  const receipts: CallLogEntry[] = [];
  const log = { log: receipts };
  const dest = trip.destination;
  const destCodes = resolveAirport(dest)?.codes ?? trip.destinationAirport ?? "";

  const tools: Record<string, (input: Record<string, unknown>) => Promise<string>> = {
    async search_places(input) {
      const query = String(input.query);
      const full = query.toLowerCase().includes(dest.toLowerCase()) ? query : `${query} in ${dest}`;
      onProgress(`🔎 Google Maps · ${full}`);
      const added = appendNew(pool.places, normalizePlaces(await serpSearch(q.mapsParams(full), log)).slice(0, 10));
      const lines = pool.places
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => added.includes(p))
        .map(({ p, i }) => `${alias.place(i)} | ${p.name} | ${p.category ?? "place"} | ${p.rating ?? "?"}★ (${p.reviews ?? 0}) | ${p.address ?? "-"} | @${p.lat.toFixed(3)},${p.lng.toFixed(3)}`);
      return lines.length ? lines.join("\n") : "No new places found.";
    },
    async search_hotels(input) {
      const max = Number(input.maxPricePerNight) || undefined;
      const minRating = Number(input.minRating) || undefined;
      const sortBy = input.sortBy === "price" ? 3 : 8;
      const ratingCode = minRating ? ({ 3.5: 7, 4: 8, 4.5: 9 } as Record<number, number>)[minRating] : undefined;
      onProgress(`🔎 Google Hotels · ${[max ? `under ${formatINR(max)}/night` : "", minRating ? `${minRating}★+` : "", input.sortBy === "price" ? "cheapest first" : ""].filter(Boolean).join(" · ") || dest}`);
      const json = await serpSearch(q.hotelParams(dest, trip.startDate, trip.endDate, { sortBy, maxPrice: max, rating: ratingCode }), log);
      const found = normalizeHotels(json).filter((h) => h.pricePerNight).slice(0, 10);
      appendNew(pool.hotels, found);
      const lines = found.map((h) => {
        const i = pool.hotels.findIndex((x) => x.id === h.id);
        return `${alias.hotel(i)} | ${h.name} | ${h.rating ?? "?"}★ (${h.reviews ?? 0}) | ${formatINR(h.pricePerNight!)}/night`;
      });
      return lines.length ? lines.join("\n") : "No hotels matched.";
    },
    async search_flights(input) {
      const person = trip.squad.find((p) => p.name.toLowerCase() === String(input.traveller).toLowerCase());
      if (!person) return `No traveller called ${input.traveller}. Squad: ${trip.squad.map((p) => p.name).join(", ")}.`;
      const home = resolveAirport(person.city)?.codes;
      if (!home || !destCodes) return "Can't search flights for this route.";
      const out = input.direction !== "back";
      const clampHour = (v: unknown, dflt: number) => (v === undefined ? dflt : Math.min(23, Math.max(0, Math.round(Number(v)) || 0)));
      const after = clampHour(input.departAfter, 0);
      const before = Math.max(after, clampHour(input.departBefore, 23));
      const times = after > 0 || before < 23 ? `${after},${before}` : undefined;
      const [from, to] = out ? [home, destCodes] : [destCodes, home];
      onProgress(`🔎 Google Flights · ${primaryCode(from)} → ${primaryCode(to)}${times ? ` · departs ${after}:00–${before}:59` : ""}${input.nonstopOnly ? " · nonstop" : ""}`);
      const json = await serpSearch(q.flightParams(from, to, out ? trip.startDate : trip.endDate, { outboundTimes: times, nonstop: !!input.nonstopOnly }), log);
      const flights: Flight[] = selectFlightOptions(normalizeFlights(json));
      if (!flights.length) return "No flights matched; the traveller's options were left unchanged.";
      (out ? pool.flightsOut : pool.flightsBack)[person.name] = flights;
      return `${person.name}'s ${out ? "outbound" : "return"} options are now:\n${flights
        .map((f) => `${f.from} ${f.departTime.slice(11)} → ${f.to} ${f.arriveTime.slice(11)} ${f.arriveTime.slice(0, 10)} · ${f.stops ? `${f.stops} stop` : "nonstop"} · ${formatINR(f.pricePerPerson)}`)
        .join("\n")}\nThe app will re-pick everyone's flights from these when you submit.`;
    },
    async search_events(input) {
      onProgress(`🔎 Google Events · ${input.query}`);
      const year = Number(trip.startDate.slice(0, 4));
      const found = normalizeEvents(await serpSearch(q.eventsParams(String(input.query)), log), year);
      appendNew(pool.events, found);
      const usable = found.filter((e) => inTrip(e, trip));
      return usable.length
        ? usable.map((e) => `${alias.event(pool.events.findIndex((x) => x.id === e.id))} | ${e.title} | ${e.date} | ${e.venue ?? "-"}`).join("\n")
        : `Found ${found.length} events, none during the trip dates.`;
    },
  };

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${poolPrompt(pool, trip, itinerary.flights)}\n\nCURRENT PLAN:\n${JSON.stringify(currentDraft(itinerary, pool))}\n\nREQUEST: ${request}`,
    },
  ];

  let retriedGrounding = false;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await createMessage({
      max_tokens: 16000,
      system: EDIT_SYSTEM,
      messages,
      tools: TOOLS.map((t) => ({ ...t, strict: true })),
      tool_choice: { type: "auto" },
      output_config: { effort: "medium" },
    });
    if (res.stop_reason === "refusal") throw new Error("Claude declined this edit.");
    messages.push({ role: "assistant", content: res.content });
    const calls = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!calls.length) {
      messages.push({ role: "user", content: "Please finish by calling submit_itinerary with the full updated plan." });
      continue;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let done: EditResult | undefined;
    for (const call of calls) {
      const input = call.input as Record<string, unknown>;
      if (call.name === "submit_itinerary") {
        onProgress("Checking every item against search results…");
        const draft = input as unknown as EditDraft;
        const grounded = groundDraft(draft, pool, trip);
        if ((grounded.removed.length || grounded.daysToFix.length) && !retriedGrounding) {
          retriedGrounding = true;
          results.push({
            type: "tool_result",
            tool_use_id: call.id,
            is_error: true,
            content: `Not accepted. ${grounded.removed.length ? `These ids are not in the lists: ${grounded.removed.join(", ")}. ` : ""}${grounded.daysToFix.length ? `Fix days: ${grounded.daysToFix.join(", ")}. ` : ""}Search if needed, then resubmit.`,
          });
          continue;
        }
        const picked: Pick<Itinerary, "flights" | "arrivalWindow"> =
          draft.flightMode === "cheapest"
            ? { flights: cheapestFlights(pool, trip) }
            : pickSquadFlights(pool.flightsOut, pool.flightsBack, trip.squad, { priceFirst: draft.priceFirst });
        const next = assembleItinerary({
          draft,
          grounded,
          removed: grounded.removed,
          trip,
          flights: picked.flights,
          arrivalWindow: picked.arrivalWindow,
          pool,
        });
        const delta = averageCost(next.costs) - averageCost(itinerary.costs);
        const note = [...describeChanges(itinerary, next), sanitizeText(draft.changeNote)].filter(Boolean).join(" ") || "Updated the plan.";
        const money = delta === 0 ? "Cost per person is unchanged." : `${delta < 0 ? "Saves" : "Adds"} ${formatINR(Math.abs(delta))} per person on average.`;
        done = { itinerary: next, pool, receipts, text: `${note} ${money}` };
        results.push({ type: "tool_result", tool_use_id: call.id, content: "Accepted." });
        continue;
      }
      const tool = tools[call.name];
      try {
        results.push({ type: "tool_result", tool_use_id: call.id, content: tool ? await tool(input) : `Unknown tool ${call.name}` });
      } catch (err) {
        onProgress(`⚠ ${call.name}: couldn't check this`);
        results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: (err as Error).message });
      }
    }
    if (done) return done;
    messages.push({ role: "user", content: results });
  }
  throw new Error("Pakka couldn't finish this edit. Try asking a bit more simply.");
}

/** Facts about what changed, written by code from the two plans. */
export function describeChanges(before: Itinerary, after: Itinerary): string[] {
  const out: string[] = [];
  const moved = after.flights.filter((f) => {
    const old = before.flights.find((b) => b.person === f.person);
    return old?.out?.id !== f.out?.id || old?.back?.id !== f.back?.id;
  });
  if (moved.length) {
    out.push(
      `New flights: ${moved
        .map((f) => `${f.person} ${f.out ? `${f.out.from} ${f.out.departTime.slice(11)} → ${f.out.to} ${f.out.arriveTime.slice(11)}` : ""}${f.back && f.back.id !== before.flights.find((b) => b.person === f.person)?.back?.id ? `, back ${f.back.departTime.slice(11)}` : ""}`)
        .join("; ")}.`,
    );
  }
  if (after.arrivalWindow && before.arrivalWindow?.last !== after.arrivalWindow.last)
    out.push(`Everyone is in by ${after.arrivalWindow.last.slice(11)}.`);
  if (after.hotel && after.hotel.id !== before.hotel?.id) out.push(`New hotel: ${after.hotel.name}${after.hotel.pricePerNight ? ` (${formatINR(after.hotel.pricePerNight)}/night)` : ""}.`);
  const ids = (it: Itinerary) => new Set(it.days.flatMap((d) => d.stops.map((s) => s.item.id)));
  const was = ids(before);
  const added = after.days.flatMap((d) => d.stops).filter((s) => !was.has(s.item.id));
  if (added.length) out.push(`Added ${added.map((s) => (s.kind === "place" ? s.item.name : s.item.title)).join(", ")}.`);
  return out;
}
