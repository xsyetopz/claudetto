import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

/** The text of each line of REVIEW.md, by the function name that starts it. */
function byName() {
  const out = new Map();
  for (const line of fs.readFileSync("REVIEW.md", "utf8").split("\n")) {
    const m = line.match(/^\W*(\w+)\W?(.*)$/);
    if (m) out.set(m[1], `${out.get(m[1]) ?? ""} ${m[2]}`);
  }
  return out;
}

test("REVIEW.md names the two defects and no sound function", () => {
  const r = byName();
  assert.match(
    r.get("loadAll") ?? "",
    /trailing|empty|last line|newline|blank|final/i,
  );
  assert.match(
    r.get("dedupe") ?? "",
    /reference|identity|object|deep|structural/i,
  );
  assert.ok(!r.has("saveAll"));
  assert.ok(!r.has("byId"));
});
