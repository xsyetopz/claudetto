// The rule: each file in `src/` has at most 40 lines.
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const BOUND = 40;
const files = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );

test("no file in `src/` is over the bound", () => {
  const over = files("src")
    .map((f) => [f, fs.readFileSync(f, "utf8").trimEnd().split("\n").length])
    .filter(([, n]) => n > BOUND);
  assert.deepStrictEqual(over, []);
});
