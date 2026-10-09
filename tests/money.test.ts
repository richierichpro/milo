import assert from "node:assert/strict";
import { test } from "node:test";
import { activityCosts, formatRange, parsePriceRange } from "../lib/money";

test("reads Google Maps price text", () => {
  assert.deepEqual(parsePriceRange("₹400–1,200"), { min: 400, max: 1200 });
  assert.deepEqual(parsePriceRange("₹2,000+"), { min: 2000 });
  assert.deepEqual(parsePriceRange("₹200"), { min: 200, max: 200 });
  assert.equal(parsePriceRange("$$"), undefined);
  assert.equal(parsePriceRange(undefined), undefined);
});

test("adds only listed prices and counts the rest", () => {
  const c = activityCosts(["₹400–1,200", undefined, "₹200–400", undefined]);
  assert.deepEqual(c, { min: 600, max: 1600, priced: 2, stops: 4 });
  assert.equal(formatRange(c), "₹600–1,600");
  const open = activityCosts(["₹2,000+", "₹200–400"]);
  assert.equal(formatRange(open), "₹2,200+");
});
