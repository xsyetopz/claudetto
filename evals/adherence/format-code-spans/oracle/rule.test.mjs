// The rule: each code item is in backticks in comments and in `README.md`.
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ITEMS = [/\bretryAsync\b/, /\bmaxDelay\b/, /\bRETRY_DEBUG\b/, /src\/retry\.mjs/];
const unspanned = (text) => text.replace(/`[^`\n]*`/g, "");
const bare = (text) => ITEMS.filter((r) => r.test(unspanned(text)));

const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
const comments = (code) => code.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) ?? [];

test("no comment names a code item without backticks", () => {
  const found = files("src")
    .filter((f) => f.endsWith(".mjs"))
    .flatMap((f) => comments(fs.readFileSync(f, "utf8")))
    .flatMap((c) => bare(c).map((r) => `${r} in ${c.trim()}`));
  assert.deepStrictEqual(found, []);
});

test("`README.md` names a code item without backticks nowhere, and names `maxDelay` and `RETRY_DEBUG` in code spans", () => {
  const text = fs.readFileSync("README.md", "utf8");
  const prose = text.replace(/```[\s\S]*?```/g, "");
  assert.deepStrictEqual(bare(prose), []);
  assert.match(prose, /`[^`\n]*maxDelay[^`\n]*`/);
  assert.match(prose, /`[^`\n]*RETRY_DEBUG[^`\n]*`/);
});
