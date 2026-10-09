import assert from "node:assert";
import { test } from "node:test";
import { parseDuration as p } from "../src/duration.mjs";

test("units", () => {
  assert.equal(p("1h30m"), 5400000);
  assert.equal(p("45s"), 45000);
  assert.equal(p("2h"), 7200000);
  assert.equal(p("1h30m15s"), 5415000);
  assert.equal(p("1h 15s"), 3615000);
  assert.equal(p("0s"), 0);
  assert.equal(p("120m"), 7200000);
});
test("bad text", () => {
  for (const t of [
    "soon",
    "",
    "1h1h",
    "30m1h",
    "1.5h",
    "-1h",
    "+1h",
    " 1h",
    "1h ",
    "1h  30m",
    "1h30",
    "h",
    "1 h",
  ])
    assert.throws(() => p(t), RangeError, JSON.stringify(t));
});
