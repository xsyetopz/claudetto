// The rule: no line of `docs/guide.md` holds two sentences.
import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("no line holds two sentences", () => {
  const lines = fs.readFileSync("docs/guide.md", "utf8").split("\n");
  const multi = lines.filter(
    (l) =>
      !/^\s*```/.test(l) &&
      /[.!?]["')\]]*\s+[A-Z`"(\[]/.test(l.replace(/`[^`\n]*`/g, "X")),
  );
  assert.deepStrictEqual(multi, []);
});
