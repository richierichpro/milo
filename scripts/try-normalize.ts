import { serpSearch } from "../lib/serpapi";
import * as q from "../lib/queries";
import * as n from "../lib/normalize";
import type { CallLogEntry } from "../lib/types";

async function main() {
  const log: CallLogEntry[] = [];
  const [out, back, hotels, places, events, explore] = await Promise.all([
    serpSearch(q.flightParams("HYD", "GOI,GOX", "2026-11-20"), { log }),
    serpSearch(q.flightParams("GOI,GOX", "HYD", "2026-11-23"), { log }),
    serpSearch(q.hotelParams("Goa", "2026-11-20", "2026-11-23"), { log }),
    serpSearch(q.mapsParams("top attractions in Goa"), { log }),
    serpSearch(q.eventsParams(q.eventsQuery("Goa")), { log }),
    serpSearch(q.exploreParams("HYD", "2026-11-20", "2026-11-23"), { log }),
  ]);
  const show = (label: string, items: unknown[]) =>
    console.log(`\n## ${label} (${items.length})\n` + JSON.stringify(items.slice(0, 2), null, 2));
  show("Flights out HYD → GOA", n.normalizeFlights(out));
  show("Flights back GOA → HYD", n.normalizeFlights(back));
  show("Hotels", n.normalizeHotels(hotels));
  show("Places", n.normalizePlaces(places));
  show("Events", n.normalizeEvents(events, 2026));
  show("Destinations", n.normalizeDestinations(explore).filter((d) => d.name === "Goa"));
  console.log("\n" + log.map((l) => `${l.engine} · ${l.source}`).join("\n"));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
