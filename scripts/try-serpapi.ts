import { serpSearch } from "../lib/serpapi";
import type { CallLogEntry } from "../lib/types";

async function main() {
  const log: CallLogEntry[] = [];
  const json = await serpSearch(
    { engine: "google_maps", type: "search", q: "best beaches in Goa", gl: "in", hl: "en" },
    { log },
  );
  for (const r of (json.local_results ?? []).slice(0, 3)) {
    console.log(`${r.title} · ${r.rating ?? "?"}★ (${r.reviews ?? 0} reviews)`);
  }
  console.log(log.map((l) => `${l.engine} · ${l.source} · ${l.ms}ms`).join("\n"));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
