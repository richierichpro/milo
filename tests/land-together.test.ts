import assert from "node:assert/strict";
import { test } from "node:test";
import { pickSquadFlights } from "../lib/land-together";
import type { Flight } from "../lib/types";

const src = { engine: "google_flights", fetchedAt: "2026-10-09T00:00:00Z" };
const f = (id: string, depart: string, arrive: string, price: number): Flight => ({
  id, source: src, from: "X", to: "GOI", departTime: `2026-11-20 ${depart}`, arriveTime: `2026-11-20 ${arrive}`,
  airline: "Test Air", flightNumbers: [id], stops: 0, via: [], durationMin: 90, pricePerPerson: price,
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

test("a friend whose flight search failed doesn't block everyone else", () => {
  const r = pickSquadFlights(
    { A: [f("Ao", "09:00", "11:00", 4000)], B: [] },
    { A: [back("Ab", "18:00", 4000)] },
    squad,
  );
  assert.equal(r.flights[0].out?.id, "Ao");
  assert.equal(r.flights[1].out, undefined);
});

test("prefers everyone at the same airport over a slightly cheaper split", () => {
  const at = (fl: Flight, to: string) => ({ ...fl, to });
  const out = {
    A: [at(f("A-GOX", "09:00", "11:00", 4000), "GOX")],
    B: [at(f("B-GOI-cheap", "09:00", "11:05", 4500), "GOI"), at(f("B-GOX", "09:00", "11:10", 6000), "GOX")],
  };
  const r = pickSquadFlights(out, { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:30", 4000)] }, squad);
  assert.equal(r.flights[1].out?.id, "B-GOX"); // ₹1,500 more beats a ₹4,000 split
});

test("prefers a nonstop over a long one-stop at a similar price", () => {
  const slow = { ...f("A-1stop", "05:00", "11:00", 4000), stops: 1, durationMin: 360 };
  const fast = { ...f("A-nonstop", "09:45", "11:00", 4800), durationMin: 75 };
  const r = pickSquadFlights({ A: [slow, fast], B: [f("Bo", "09:00", "11:00", 4000)] }, { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:00", 4000)] }, squad);
  assert.equal(r.flights[0].out?.id, "A-nonstop");
});

test("priceFirst gives that person their cheapest flight", () => {
  const out = {
    A: [f("A-cheap-early", "05:00", "07:00", 3000), f("A-aligned", "09:00", "11:00", 4300)],
    B: [f("B-only", "08:30", "11:20", 5000)],
  };
  const backs = { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:30", 4000)] };
  assert.equal(pickSquadFlights(out, backs, squad).flights[0].out?.id, "A-aligned");
  assert.equal(pickSquadFlights(out, backs, squad, { priceFirst: ["A"] }).flights[0].out?.id, "A-cheap-early");
});

test("priceFirst with keep leaves everyone else on their flights", () => {
  const bOld = f("B-old", "08:30", "11:20", 5000);
  const out = { A: [f("A-cheap", "05:00", "07:00", 3000), f("A-aligned", "09:00", "11:00", 4300)], B: [f("B-new", "04:00", "06:00", 4000), bOld] };
  const backs = { A: [back("Ab", "18:00", 4000)], B: [back("Bb", "18:30", 4000)] };
  const r = pickSquadFlights(out, backs, squad, { priceFirst: ["A"], keep: [{ person: "B", city: "Delhi", out: bOld, back: backs.B[0] }] });
  assert.equal(r.flights[0].out?.id, "A-cheap");
  assert.equal(r.flights[1].out?.id, "B-old");
});
