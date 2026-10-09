import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("IMPACT.md lists the callers and not the others", () => {
  const a = fs.readFileSync("IMPACT.md", "utf8");
  for (const f of ["src/cart.mjs", "src/invoice.mjs", "src/promo.mjs"])
    assert.ok(a.includes(f));
  assert.ok(!a.includes("src/unrelated.mjs"));
});
