import assert from "node:assert/strict";
import { test } from "node:test";
import { settleUp } from "../lib/settle";

test("equal split settles everyone to the average", () => {
  const line = (person: string, total: number) => ({ person, flights: total, hotelShare: 0, total });
  const r = settleUp([line("Aarav", 15000), line("Meera", 14000), line("Kabir", 22000), line("Ishita", 13000)]);
  assert.equal(r.average, 16000);
  const net = new Map<string, number>();
  for (const t of r.transfers) {
    net.set(t.from, (net.get(t.from) ?? 0) + t.amount);
    net.set(t.to, (net.get(t.to) ?? 0) - t.amount);
  }
  assert.equal(net.get("Kabir"), -6000); // receives 6,000
  assert.equal(net.get("Ishita"), 3000);
  assert.equal(net.get("Meera"), 2000);
  assert.equal(net.get("Aarav"), 1000);
});
