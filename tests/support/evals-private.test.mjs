// The eval cases ship in `plugins/dotclaude/evals/` and nowhere else.
// No other file of `plugins/` names a case, a grader, or `case.yaml`,
// so the text of a case does not leak into the context of the agent under test.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { PLUGINS, walk } from "./repo.mjs";

const EVALS = path.join(PLUGINS, "dotclaude", "evals");
const SKIP = ["node_modules", ".git"];
const files = (dir) => walk(dir, { skip: SKIP });

const cases = files(EVALS).filter((p) => p.endsWith(`${path.sep}case.yaml`));
const names = cases.flatMap((file) => {
  const doc = parse(fs.readFileSync(file, "utf8"));
  return [doc.name, ...doc.graders.map((g) => g.name)];
});
const outside = files(PLUGINS).filter(
  (p) => !p.startsWith(EVALS + path.sep) && !fs.lstatSync(p).isSymbolicLink(),
);

test("the eval folder holds cases", () => {
  assert.ok(cases.length > 0, `${cases.length}`);
});

test("a case file sits only in the eval folder", () => {
  const stray = files(PLUGINS).filter(
    (p) => path.basename(p) === "case.yaml" && !p.startsWith(EVALS + path.sep),
  );
  assert.deepEqual(stray, []);
});

// A lint of the live repository.
test("lint: no file outside the eval folder names `case.yaml`, a case, or a grader", () => {
  const leaks = [];
  for (const file of outside) {
    const buf = fs.readFileSync(file);
    if (buf.includes(0)) continue;
    const text = buf.toString("utf8");
    const hit = ["case.yaml", ...names].find((n) => text.includes(n));
    if (hit) leaks.push(`${path.relative(PLUGINS, file)}: ${hit}`);
  }
  assert.deepEqual(leaks, []);
});
