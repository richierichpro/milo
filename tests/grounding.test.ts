import assert from "node:assert/strict";
import { test } from "node:test";
import type { CandidatePool } from "../lib/gather";
import { groundDraft, type PlanDraft } from "../lib/planner";
import type { Place } from "../lib/types";

const src = { engine: "google_maps", fetchedAt: "2026-10-09T00:00:00Z" };
const place = (id: string): Place => ({ id, source: src, name: id, lat: 15.5, lng: 73.8, mapsUrl: "" });

const pool: CandidatePool = {
  flightsOut: {}, flightsBack: {}, events: [], receipts: [], errors: [],
  hotels: [{ id: "hotel:real", source: src, name: "Real Hotel", lat: 15.5, lng: 73.8, amenities: [], pricePerNight: 3000 }],
  places: [place("place:a"), place("place:b"), place("place:c")],
};
const trip = { squad: [{ name: "A", city: "Pune" }], destination: "Goa", startDate: "2026-11-20", endDate: "2026-11-22", interests: [] };

test("a made-up id is removed and reported", () => {
  const draft: PlanDraft = {
    title: "t", summary: "s", hotelId: "hotel:real",
    days: [
      { date: "2026-11-20", title: "d1", stops: [{ id: "place:a", time: "18:00", why: "x" }] },
      { date: "2026-11-21", title: "d2", stops: [
        { id: "place:b", time: "10:00", why: "x" },
        { id: "place:FAKE-claude-invented", time: "13:00", why: "sounds great" },
      ] },
      { date: "2026-11-22", title: "d3", stops: [{ id: "place:c", time: "09:00", why: "x" }] },
    ],
  };
  const g = groundDraft(draft, pool, trip);
  assert.deepEqual(g.removed, ["place:FAKE-claude-invented"]);
  assert.deepEqual(g.daysToFix, ["2026-11-21"]);
  assert.equal(g.days[1].stops.length, 1);
  assert.equal(g.days[1].stops[0].item.id, "place:b");
  assert.equal(g.hotel?.id, "hotel:real");
});

test("an invented hotel and an empty middle day are flagged", () => {
  const draft: PlanDraft = { title: "t", summary: "s", hotelId: "hotel:taj-imaginary", days: [] };
  const g = groundDraft(draft, pool, trip);
  assert.deepEqual(g.removed, ["hotel:taj-imaginary"]);
  assert.equal(g.hotel, undefined);
  assert.deepEqual(g.daysToFix, ["2026-11-21"]);
});

test("a duplicate stop is dropped", () => {
  const draft: PlanDraft = {
    title: "t", summary: "s", hotelId: "hotel:real",
    days: [{ date: "2026-11-21", title: "d", stops: [{ id: "place:a", time: "10:00", why: "x" }, { id: "place:a", time: "15:00", why: "y" }] }],
  };
  const g = groundDraft(draft, pool, trip);
  assert.equal(g.days[1].stops.length, 1);
});

test("short ids resolve to the real candidates, made-up short ids don't", () => {
  const draft: PlanDraft = {
    title: "t", summary: "s", hotelId: "h1",
    days: [{ date: "2026-11-21", title: "d", stops: [{ id: "p2", time: "10:00", why: "x" }, { id: "p99", time: "12:00", why: "y" }] }],
  };
  const g = groundDraft(draft, pool, trip);
  assert.equal(g.hotel?.id, "hotel:real");
  assert.equal(g.days[1].stops[0].item.id, "place:b");
  assert.deepEqual(g.removed, ["p99"]);
});

test("Claude's text loses sentences that state prices or numbers", async () => {
  const { sanitizeText } = await import("../lib/planner");
  assert.equal(
    sanitizeText("Beaches and seafood all weekend. The hotel is ₹2,049 a night. Ends with a big night out in Baga."),
    "Beaches and seafood all weekend. Ends with a big night out in Baga.",
  );
});
