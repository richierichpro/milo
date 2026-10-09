import assert from "node:assert/strict";
import { test } from "node:test";
import { stopPrice } from "../lib/money";
import { normalizePlacePrices } from "../lib/normalize";
import type { Stop } from "../lib/types";

const json = {
  search_metadata: { created_at: "2026-10-09 10:00:00 UTC" },
  place_results: {
    place_id: "abc",
    admission: [{ title: "Fort", options: [{ title: "General Adult Admission", price: "₹250.00", extracted_price: 250, official_site: true, link: "https://asi.example" }] }],
    experiences: [
      { title: "Big tour", price: "₹5,520", extracted_price: 5520, source: "Evendo" },
      { title: "Day tour", price: "₹599", extracted_price: 599, source: "FindrHost", rating: 4.2, reviews: 149 },
      { title: "No price" },
    ],
  },
};

test("place details give entry tickets and tours, cheapest first", () => {
  const p = normalizePlacePrices(json);
  assert.equal(p.admission[0].price, 250);
  assert.equal(p.admission[0].official, true);
  assert.deepEqual(p.tours.map((t) => t.price), [599, 5520]);
  assert.equal(p.source.url, "https://www.google.com/maps/place/?q=place_id:abc");
});

test("a stop costs its entry ticket; tours are optional and not counted", () => {
  const stop = {
    kind: "place",
    time: "10:00",
    why: "",
    item: { id: "place:abc", source: { engine: "google_maps", fetchedAt: "" }, name: "Fort", lat: 0, lng: 0, mapsUrl: "", prices: normalizePlacePrices(json) },
  } as Stop;
  assert.deepEqual(stopPrice(stop), { min: 250, max: 250 });
});
