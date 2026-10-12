// Tests of the parsers of the spec formats: one fixture for each format, and
// the errors with their line numbers.

import { expect, test } from "bun:test";
import path from "node:path";
import {
  parseDelta,
  parseSpec,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/parse.ts";
import {
  parsePackage,
  parseTasks,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/plan.ts";
import { REPO } from "../../../support/repo.ts";
import {
  DELTA_TEXT,
  PACKAGE_TEXT,
  SPEC_TEXT,
  TASKS_TEXT,
  withLine,
} from "./fixtures.ts";

const lineErrors = (r: { ok: boolean; errors?: { line: number }[] }) =>
  r.ok ? [] : (r.errors ?? []).map((e) => e.line);

test("`parseSpec` reads the requirements, their sentences, and their scenarios", () => {
  const r = parseSpec(SPEC_TEXT);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.requirements.map((q) => q.name)).toStrictEqual([
    "Spec store reader",
    "Lane names",
  ]);
  const reader = r.value.requirements[0];
  expect(reader?.text).toBe("The reader SHALL give the state of one change.");
  expect(reader?.scenarios).toStrictEqual([
    {
      name: "Known schema",
      whenLines: ["the file has schema 1"],
      thenLines: ["the reader gives the state"],
    },
    {
      name: "Unknown schema",
      whenLines: ["the file has schema 2"],
      thenLines: ["the reader stops with an error that names the file"],
    },
  ]);
  expect(r.value.requirements[1]?.scenarios[0]?.whenLines).toStrictEqual([
    "the main session moves a package",
  ]);
});

test("`parseSpec` gives the line of a repeated requirement", () => {
  // SPEC_TEXT ends with a newline, so its split has one more item than its lines.
  const appended = SPEC_TEXT.split("\n").length;
  const r = parseSpec(
    `${SPEC_TEXT}### Requirement: Lane names\nThe tool SHALL run.\n`,
  );
  expect(r.ok).toBe(false);
  expect(lineErrors(r)).toStrictEqual([appended]);
});

test("`parseSpec` gives the line of an unknown `###` heading", () => {
  const r = parseSpec("## Requirements\n\n### Notes\nSome text.\n");
  expect(lineErrors(r)).toStrictEqual([3]);
});

test("`parseDelta` reads the four sections", () => {
  const r = parseDelta(DELTA_TEXT);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.added.map((q) => q.name)).toStrictEqual(["Change archive"]);
  expect(r.value.modified.map((q) => q.name)).toStrictEqual([
    "Spec store reader",
  ]);
  expect(r.value.removed).toStrictEqual(["Lane names"]);
  expect(r.value.renamed).toStrictEqual([{ from: "Old name", to: "New name" }]);
});

test("`parseDelta` gives the line of an unknown section", () => {
  const r = parseDelta("## CHANGED\n\n");
  expect(lineErrors(r)).toStrictEqual([1]);
});

test("`parseDelta` gives the line of a `FROM:` line with no `TO:` line", () => {
  const r = parseDelta("## RENAMED\n- FROM: Old\n- FROM: Other\n- TO: New\n");
  expect(lineErrors(r)).toStrictEqual([2]);
});

test("`parseDelta` gives the line of a `TO:` line with no `FROM:` line", () => {
  const r = parseDelta("## RENAMED\n- TO: New\n");
  expect(lineErrors(r)).toStrictEqual([2]);
});

test("`parseDelta` gives the line of a repeated section", () => {
  const r = parseDelta("## REMOVED\n\n## ADDED\n\n## REMOVED\n");
  expect(lineErrors(r)).toStrictEqual([5]);
});

test("`parseTasks` reads each task with its `Verify:` line and its state", () => {
  const r = parseTasks(TASKS_TEXT);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(
    r.value.map((t) => ({ id: t.id, done: t.done, verify: t.verify })),
  ).toStrictEqual([
    {
      id: "1.1",
      done: false,
      verify: "`just test tests/dotclaude/spec/domain`",
    },
    { id: "1.2", done: true, verify: "`just check`" },
  ]);
});

test("`parseTasks` gives a task with no `Verify:` line a null verify", () => {
  const r = parseTasks(
    "- [ ] 1.1 Write the parser\n- [ ] 1.2 Write more\n  Verify: `x`\n",
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.map((t) => t.verify)).toStrictEqual([null, "`x`"]);
});

test("`parseTasks` gives the line of a `Verify:` line outside a task", () => {
  const r = parseTasks("# Tasks\n  Verify: `x`\n");
  expect(lineErrors(r)).toStrictEqual([2]);
});

test("`parseTasks` gives the line of a malformed task", () => {
  const r = parseTasks("- [ ]  missing id\n");
  expect(lineErrors(r)).toStrictEqual([1]);
});

test("`parsePackage` reads the front matter and the five sections", () => {
  const r = parsePackage(PACKAGE_TEXT);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.front).toStrictEqual({
    id: "P02",
    deps: [],
    owns: [
      "src/plugins/dotclaude/slices/spec/domain/",
      "tests/dotclaude/spec/domain/",
    ],
    verify: "just test tests/dotclaude/spec/domain",
    agent: "implementer",
  });
  expect(r.value.sections.Goal).toBe("Write the pure domain code.");
  expect(r.value.sections.Boundaries).toBe("- Change only the domain folder.");
});

test("`parsePackage` reads a dep list", () => {
  const r = parsePackage(
    withLine(PACKAGE_TEXT, "deps:", 'deps: [P01a, "P01b"]'),
  );
  expect(r.ok && r.value.front.deps).toStrictEqual(["P01a", "P01b"]);
});

test("`parsePackage` gives the line of a missing front matter key", () => {
  const text = PACKAGE_TEXT.replace("agent: implementer\n", "");
  const r = parsePackage(text);
  expect(r.ok).toBe(false);
  expect(lineErrors(r)).toStrictEqual([6]);
});

test("`parsePackage` gives the line of an unknown front matter key", () => {
  const r = parsePackage(
    withLine(PACKAGE_TEXT, "agent:", "agent: implementer\nlane: doing"),
  );
  expect(lineErrors(r)).toStrictEqual([7]);
});

test("`parsePackage` gives the line of an unknown section", () => {
  const r = parsePackage(withLine(PACKAGE_TEXT, "## Steps", "## Notes"));
  expect(lineErrors(r)).toStrictEqual([19]);
});

test("`parsePackage` fails on a file with no front matter", () => {
  const r = parsePackage("# P02\n\n## Goal\n");
  expect(lineErrors(r)).toStrictEqual([1]);
});

test("`parsePackage` reads the real package `01a-kernel.md`", async () => {
  const text = await Bun.file(
    path.join(REPO, "spec/changes/1.0.0/packages/01a-kernel.md"),
  ).text();
  const r = parsePackage(text);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.value.front.id).toBe("P01a");
  expect(r.value.front.owns).toStrictEqual(["src/kernel/", "tests/kernel/"]);
});

test("`parseTasks` reads the real task list `packages.md`", async () => {
  const text = await Bun.file(
    path.join(REPO, "spec/changes/1.0.0/packages.md"),
  ).text();
  const r = parseTasks(text);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const p02 = r.value.find((t) => t.id === "P02");
  expect(p02?.verify).toBe(
    "`just test tests/dotclaude/spec/domain`, on a fixture for each format and each delta rule.",
  );
  const p00 = r.value.find((t) => t.id === "P00");
  expect(p00?.verify).toBeNull();
});
