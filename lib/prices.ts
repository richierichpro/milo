import type { CandidatePool } from "./gather";
import { normalizePlacePrices } from "./normalize";
import { placeDetailsParams } from "./queries";
import { serpSearch } from "./serpapi";
import type { CallLogEntry, Itinerary, Place, Stop } from "./types";

// Ticket and tour prices come from one Google Maps place-details lookup per
// stop, after Claude has planned. Only the plan's stops are looked up, never
// the whole candidate pool, and stops that can't have a listed entry price are
// skipped to save searches.

/** Beaches have no admission listings; restaurants with a price already have one. */
function needsLookup(p: Place): boolean {
  if (p.prices) return false;
  if (p.priceLevel) return false;
  if (/beach/i.test(p.category ?? "")) return false;
  return true;
}

const placeIdOf = (p: Place) => p.id.replace(/^place:/, "");

/** Adds prices to the plan's stops (and the same places in the pool, so edits reuse them). */
export async function addPrices(
  itinerary: Itinerary,
  pool: CandidatePool,
  log: CallLogEntry[],
  onProgress?: (text: string) => void,
): Promise<Itinerary> {
  const places = itinerary.days.flatMap((d) => d.stops).filter((s): s is Extract<Stop, { kind: "place" }> => s.kind === "place").map((s) => s.item);
  const todo = [...new Map(places.filter(needsLookup).map((p) => [p.id, p])).values()];
  if (!todo.length) return itinerary;

  onProgress?.(`Checking ticket prices on Google Maps (${todo.length} place${todo.length === 1 ? "" : "s"})…`);
  const found = new Map<string, Place["prices"]>();
  await Promise.all(
    todo.map(async (p) => {
      try {
        found.set(p.id, normalizePlacePrices(await serpSearch(placeDetailsParams(placeIdOf(p)), { log })));
      } catch {
        // Leave it unpriced; the card says no price is listed.
      }
    }),
  );

  for (const p of pool.places) if (found.has(p.id)) p.prices = found.get(p.id);
  return {
    ...itinerary,
    days: itinerary.days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => (s.kind === "place" && found.has(s.item.id) ? { ...s, item: { ...s.item, prices: found.get(s.item.id) } } : s)),
    })),
  };
}
