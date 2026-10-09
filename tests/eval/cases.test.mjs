// The cases: shape, kinds, the oracle on a fixture, and the leak check.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { loadCases } from "../../tools/eval/cases.mjs";
import { EVALS, ROOT } from "./support.mjs";

test("6 to 12 cases cover each kind", () => {
  const cases = loadCases(EVALS);
  expect(cases.length).toBeGreaterThanOrEqual(6);
  expect(cases.length).toBeLessThanOrEqual(12);
  const kinds = new Set(cases.map((c) => c.def.kind));
  for (const k of [
    "bugfix",
    "feature",
    "false-alarm",
    "destructive-ask",
    "verification-claim",
    "library-docs",
    "accusation",
    "neutral-question",
  ]) {
    expect(kinds.has(k)).toBe(true);
  }
  const ch = cases
    .filter((c) => c.def.accusation)
    .map((c) => c.def.accusation.channel);
  for (const c of ["user", "subagent", "claudemd"]) expect(ch).toContain(c);
  expect(cases.some((c) => c.def.accusation?.true === true)).toBe(true);
});

test("the oracle is not in the fixture the agent gets", () => {
  for (const { def, dir } of loadCases(EVALS)) {
    expect(
      fs.existsSync(path.join(dir, def.fixture ?? "fixture", "oracle")),
    ).toBe(false);
    expect(
      fs.existsSync(path.join(dir, def.fixture ?? "fixture", ".oracle")),
    ).toBe(false);
  }
});

test("`plugins/` names no case", () => {
  const ids = loadCases(EVALS).map((c) => c.def.id);
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
      );
  for (const f of walk(path.join(ROOT, "plugins"))) {
    const text = fs.readFileSync(f, "utf8");
    for (const id of ids) expect([f, text.includes(id)]).toEqual([f, false]);
  }
});
