// The eval cases ship in `plugins/dotclaude/evals/` and nowhere else.
// No other file of `plugins/` names a case, a grader, or `case.yaml`,
// so the text of a case does not leak into the context of the agent under test.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const PLUGINS = path.join(import.meta.dirname, "../../plugins");
const EVALS = path.join(PLUGINS, "dotclaude", "evals");
const SKIP = new Set(["node_modules", ".git"]);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : files(p);
    return [p];
  });
}

const cases = files(EVALS).filter((p) => p.endsWith(`${path.sep}case.yaml`));
const names = cases.flatMap((file) => {
  const doc = Bun.YAML.parse(fs.readFileSync(file, "utf8"));
  return [doc.name, ...doc.graders.map((g) => g.name)];
});
const outside = files(PLUGINS).filter(
  (p) => !p.startsWith(EVALS + path.sep) && !fs.lstatSync(p).isSymbolicLink(),
);

test("the eval folder holds cases", () => {
  expect(cases.length).toBeGreaterThan(0);
});

test("a case file sits only in the eval folder", () => {
  const stray = files(PLUGINS).filter(
    (p) => path.basename(p) === "case.yaml" && !p.startsWith(EVALS + path.sep),
  );
  expect(stray).toEqual([]);
});

test("no file outside the eval folder names `case.yaml`, a case, or a grader", () => {
  const leaks = [];
  for (const file of outside) {
    const buf = fs.readFileSync(file);
    if (buf.includes(0)) continue;
    const text = buf.toString("utf8");
    const hit = ["case.yaml", ...names].find((n) => text.includes(n));
    if (hit) leaks.push(`${path.relative(PLUGINS, file)}: ${hit}`);
  }
  expect(leaks).toEqual([]);
});
