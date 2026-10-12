// Tests of the delta rules: each section has a pass case and a failure case,
// and a failed delta gives no new spec and leaves the input spec unchanged.

import { expect, test } from "bun:test";
import {
  applyDelta,
  type DeltaFailure,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/delta.ts";
import type { CapabilitySpec } from "../../../../src/plugins/dotclaude/slices/spec/domain/formats.ts";
import {
  parseDelta,
  parseSpec,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/parse.ts";
import { must } from "./fixtures.ts";

const block = (name: string, text = "The tool SHALL run."): string =>
  `### Requirement: ${name}\n${text}\n\n#### Scenario: Run\n- **WHEN** the tool starts\n- **THEN** the tool runs\n`;

const BASE = `${block("Alpha")}\n${block("Beta")}`;

const base = (): CapabilitySpec => must(parseSpec(BASE));

const names = (spec: CapabilitySpec): string[] =>
  spec.requirements.map((r) => r.name);

const deltaOf = (text: string) => must(parseDelta(text));

const failuresOf = (r: ReturnType<typeof applyDelta>): DeltaFailure[] =>
  r.ok ? [] : r.errors;

test("`applyDelta` gives the spec with the `ADDED` requirement at the end", () => {
  const r = applyDelta(base(), deltaOf(`## ADDED\n${block("Gamma")}`));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(names(r.value)).toStrictEqual(["Alpha", "Beta", "Gamma"]);
});

test("`applyDelta` fails `ADDED` on a name that exists", () => {
  const r = applyDelta(base(), deltaOf(`## ADDED\n${block("Alpha")}`));
  expect(failuresOf(r)).toStrictEqual([
    { section: "ADDED", name: "Alpha", reason: "exists" },
  ]);
});

test("`applyDelta` replaces the full block of a `MODIFIED` requirement", () => {
  const r = applyDelta(
    base(),
    deltaOf(`## MODIFIED\n${block("Alpha", "The tool SHALL stop.")}`),
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(names(r.value)).toStrictEqual(["Alpha", "Beta"]);
  expect(r.value.requirements[0]?.text).toBe("The tool SHALL stop.");
});

test("`applyDelta` fails `MODIFIED` on a name that does not exist", () => {
  const r = applyDelta(base(), deltaOf(`## MODIFIED\n${block("Gamma")}`));
  expect(failuresOf(r)).toStrictEqual([
    { section: "MODIFIED", name: "Gamma", reason: "missing" },
  ]);
});

test("`applyDelta` deletes the block of a `REMOVED` requirement", () => {
  const r = applyDelta(base(), deltaOf("## REMOVED\n### Requirement: Alpha\n"));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(names(r.value)).toStrictEqual(["Beta"]);
});

test("`applyDelta` fails `REMOVED` on a name that does not exist", () => {
  const r = applyDelta(base(), deltaOf("## REMOVED\n### Requirement: Gamma\n"));
  expect(failuresOf(r)).toStrictEqual([
    { section: "REMOVED", name: "Gamma", reason: "missing" },
  ]);
});

test("`applyDelta` renames a requirement before `MODIFIED` uses the new name", () => {
  const text = `## RENAMED\n- FROM: Alpha\n- TO: Omega\n## MODIFIED\n${block("Omega", "The tool SHALL stop.")}`;
  const r = applyDelta(base(), deltaOf(text));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(names(r.value)).toStrictEqual(["Omega", "Beta"]);
  expect(r.value.requirements[0]?.text).toBe("The tool SHALL stop.");
});

test("`applyDelta` fails `RENAMED` on a `FROM` name that does not exist", () => {
  const r = applyDelta(
    base(),
    deltaOf("## RENAMED\n- FROM: Gamma\n- TO: Delta\n"),
  );
  expect(failuresOf(r)).toStrictEqual([
    { section: "RENAMED", name: "Gamma", reason: "missing" },
  ]);
});

test("`applyDelta` fails `RENAMED` on a `TO` name that exists", () => {
  const r = applyDelta(
    base(),
    deltaOf("## RENAMED\n- FROM: Alpha\n- TO: Beta\n"),
  );
  expect(failuresOf(r)).toStrictEqual([
    { section: "RENAMED", name: "Beta", reason: "exists" },
  ]);
});

test("`applyDelta` runs `REMOVED` before `ADDED`, so a name can come back", () => {
  const text = `## REMOVED\n### Requirement: Alpha\n## ADDED\n${block("Alpha", "The tool SHALL stop.")}`;
  const r = applyDelta(base(), deltaOf(text));
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(names(r.value)).toStrictEqual(["Beta", "Alpha"]);
  expect(r.value.requirements[1]?.text).toBe("The tool SHALL stop.");
});

test("`applyDelta` runs `MODIFIED` after `REMOVED`, so a removed name is missing", () => {
  const text = `## REMOVED\n### Requirement: Alpha\n## MODIFIED\n${block("Alpha")}`;
  const r = applyDelta(base(), deltaOf(text));
  expect(failuresOf(r)).toStrictEqual([
    { section: "MODIFIED", name: "Alpha", reason: "missing" },
  ]);
});

test("`applyDelta` gives no new spec when one delta fails, and leaves the input spec", () => {
  const spec = base();
  const text = `## ADDED\n${block("Gamma")}## REMOVED\n### Requirement: Missing\n`;
  const r = applyDelta(spec, deltaOf(text));
  expect(r.ok).toBe(false);
  expect(failuresOf(r)).toStrictEqual([
    { section: "REMOVED", name: "Missing", reason: "missing" },
  ]);
  expect(names(spec)).toStrictEqual(["Alpha", "Beta"]);
});

test("`applyDelta` lists each failed delta, not only the first", () => {
  const text = `## ADDED\n${block("Alpha")}## MODIFIED\n${block("Gamma")}`;
  const r = applyDelta(base(), deltaOf(text));
  expect(failuresOf(r).map((f) => f.section)).toStrictEqual([
    "MODIFIED",
    "ADDED",
  ]);
});
