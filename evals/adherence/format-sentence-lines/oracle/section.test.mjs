import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

test("the Troubleshooting section holds at least five sentences", () => {
  const text = fs.readFileSync("docs/guide.md", "utf8");
  const m = /^#+\s*Troubleshooting\s*$/im.exec(text);
  assert.ok(m, "no Troubleshooting heading");
  const body = text.slice(m.index + m[0].length).replace(/`[^`\n]*`/g, "X");
  const count = (body.match(/[.!?](?:\s|$)/g) ?? []).length;
  assert.ok(count >= 5, `only ${count} sentences`);
});
