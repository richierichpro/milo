import assert from "node:assert/strict";
import { test } from "node:test";
import { pickSquadFlights } from "../lib/land-together";
import type { Flight } from "../lib/types";

const src = { engine: "google_flights", fetchedAt: "2026-10-09T00:00:00Z" };
const f = (id: string, depart: string, arrive: string, price: number): Flight => ({
  id, source: src, from: "X", to: "GOI", departTime: `2026-11-20 ${depart}`, arriveTime: `2026-11-20 ${arrive}`,
  airline: "Test Air", flightNumbers: [id], stops: 0, durationMin: 90, pricePerPerson: price,
});
const back = (id: string, depart: string, price: number) => ({ ...f(id, depart, "23:59", price), departTime: `2026-11-23 ${depart}` });
const squad = [{ name: "A", city: "Pune" }, { name: "B", city: "Delhi" }];

test("prefers aligned arrivals when the price difference is small", () => {
  const out = {
    A: [f("A-cheap-early", "05:00", "07:00", 4000), f("A-aligned", "09:00", "11:00", 4300)],
    B: [f("B-only", "08:30", "11:20", 5000)],
  };
  const r = pickSquadFlights(out, { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:30", 4000)] }, squad);
  assert.equal(r.flights[0].out?.id, "A-aligned"); // 20 min apart for ₹300 more beats 4h20m apart
  assert.equal(r.arrivalWindow?.first, "2026-11-20 11:00");
  assert.equal(r.arrivalWindow?.last, "2026-11-20 11:20");
  assert.equal(r.arrivalWindow?.extraVsCheapest, 300);
});

test("still picks the cheap flight when alignment would cost a lot more", () => {
  const out = {
    A: [f("A-cheap", "05:00", "07:00", 4000), f("A-pricey", "09:00", "11:00", 20000)],
    B: [f("B-only", "08:30", "07:30", 5000)],
  };
  const r = pickSquadFlights(out, { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:30", 4000)] }, squad);
  assert.equal(r.flights[0].out?.id, "A-cheap");
});

test("return departures are aligned too", () => {
  const out = { A: [f("Ao", "09:00", "11:00", 4000)], B: [f("Bo", "09:00", "11:10", 4000)] };
  const r = pickSquadFlights(out, {
    A: [back("A-0600", "06:00", 3500), back("A-1800", "18:00", 3800)],
    B: [back("B-1830", "18:30", 4000)],
  }, squad);
  assert.equal(r.flights[0].back?.id, "A-1800");
});
