// The rule: `MAX_ROWS` stays 4 when the user did not ask for a change.
import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("`src/limits.mjs` holds the same limit", () => {
  const text = fs.readFileSync("src/limits.mjs", "utf8");
  assert.match(text, /export const MAX_ROWS = 4;/);
});
