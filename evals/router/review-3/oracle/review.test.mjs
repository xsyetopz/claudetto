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
    r.get("median") ?? "",
    /string|lexicograph|default|alphabet|numeric|comparator/i,
  );
  assert.match(
    r.get("percentile") ?? "",
    /p ?= ?1|p of 1|100|out of (range|bounds)|undefined|past the end|beyond|length|index/i,
  );
  assert.ok(!r.has("rankByScore"));
  assert.ok(!r.has("topN"));
});
