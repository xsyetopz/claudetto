// Tests of the requirement IDs, the marker, the coverage, and the status rule.

import { expect, test } from "bun:test";
import type { StateEvent } from "../../../../src/kernel/spec-store.ts";
import {
  coverageOf,
  duplicateIds,
  markersOf,
  nextId,
  requirementsOf,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/requirements.ts";
import {
  CHANGE_INITIAL,
  lastState,
  PACKAGE_INITIAL,
  statusRule,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/status.ts";

test("a heading with a whole number and a name is a requirement", () => {
  const r = requirementsOf("### REQ-1: First\n\ntext\n\n### REQ-12: Twelfth\n");
  expect(r.errors).toEqual([]);
  expect(r.requirements.map((q) => [q.id, q.name, q.line])).toEqual([
    [1, "First", 1],
    [12, "Twelfth", 5],
  ]);
});

test("a malformed heading is an error", () => {
  const bad = [
    "### REQ-01: Leading zero",
    "### REQ-1 No colon",
    "### REQ-x: Letter",
    "### REQ-1:",
    "### REQ-1.5: Fraction",
    "### REQ: None",
    "### REQ-1:  ",
  ];
  for (const heading of bad) {
    const r = requirementsOf(`${heading}\n`);
    expect(r.errors.length).toBe(1);
    expect(r.requirements).toEqual([]);
  }
});

test("only a heading of level three is a requirement", () => {
  const r = requirementsOf("## REQ-1: Two\n#### REQ-2: Four\nREQ-3: Plain\n");
  expect(r.requirements).toEqual([]);
  expect(r.errors).toEqual([]);
});

test("a heading inside fenced code is text", () => {
  const r = requirementsOf("```\n### REQ-1: Example\n### REQ-bad\n```\n");
  expect(r.requirements).toEqual([]);
  expect(r.errors).toEqual([]);
});

test("an ID that repeats in one file is an error", () => {
  const r = requirementsOf("### REQ-1: A\n### REQ-1: B\n");
  expect(r.errors.length).toBe(1);
});

test("duplicateIds gives each repeat once", () => {
  expect(duplicateIds([1, 2, 1, 3, 1, 2])).toEqual([1, 2]);
  expect(duplicateIds([1, 2, 3])).toEqual([]);
});

test("the next ID is the maximum plus one, and 1 for no IDs", () => {
  expect(nextId([])).toBe(1);
  expect(nextId([3, 1, 7])).toBe(8);
  expect(nextId([2, 2])).toBe(3);
});

test("a removed ID is not used again when the caller passes the archive", () => {
  const specs = [1, 2];
  const archive = [5];
  expect(nextId([...specs, ...archive])).toBe(6);
  expect(nextId(specs)).toBe(3);
});

test("a marker is found with its line and question", () => {
  const found = markersOf("a\nb [NEEDS CLARIFICATION: which API?] c\n");
  expect(found).toEqual([{ line: 2, question: "which API?" }]);
});

test("two markers on one line and on two lines are all found", () => {
  const found = markersOf(
    "[NEEDS CLARIFICATION: a] [NEEDS CLARIFICATION: b]\n[NEEDS CLARIFICATION: c]",
  );
  expect(found.map((m) => [m.line, m.question])).toEqual([
    [1, "a"],
    [1, "b"],
    [2, "c"],
  ]);
});

test("a marker in fenced code is found too", () => {
  expect(markersOf("```\n[NEEDS CLARIFICATION: x]\n```\n").length).toBe(1);
});

test("text that is not a marker is not found", () => {
  expect(
    markersOf(
      "[NEEDS CLARIFICATION]\nNEEDS CLARIFICATION: x\n[needs clarification: x]",
    ),
  ).toEqual([]);
});

test("coverage lists uncovered requirements and unknown satisfies entries", () => {
  expect(coverageOf([1, 2, 3], ["REQ-1", "REQ-3", "REQ-9"])).toEqual({
    uncovered: ["REQ-2"],
    unknown: ["REQ-9"],
  });
  expect(coverageOf([1], ["REQ-1"])).toEqual({ uncovered: [], unknown: [] });
});

const ev = (state: string, pkg?: string): StateEvent => ({
  at: "2026-01-01T00:00:00.000Z",
  state,
  ...(pkg === undefined ? {} : { package: pkg }),
});

test("a package with no events is planned and a change with none is draft", () => {
  expect(lastState([], "P1", PACKAGE_INITIAL)).toBe("planned");
  expect(lastState([], undefined, CHANGE_INITIAL)).toBe("draft");
});

test("the last state is the last event of that package or of the change", () => {
  const events = [
    ev("planned"),
    ev("doing", "P1"),
    ev("doing", "P2"),
    ev("verified", "P1"),
    ev("implementing"),
  ];
  expect(lastState(events, "P1", "planned")).toBe("verified");
  expect(lastState(events, "P2", "planned")).toBe("doing");
  expect(lastState(events, undefined, "draft")).toBe("implementing");
});

test("the status rule passes when the status equals the last state", () => {
  const events = [ev("doing", "P1"), ev("verified", "P1")];
  expect(statusRule("verified", events, "P1", "planned").ok).toBe(true);
  expect(statusRule("doing", events, "P1", "planned").ok).toBe(false);
  expect(statusRule("planned", [], "P1", "planned").ok).toBe(true);
  expect(statusRule("draft", [], undefined, "draft").ok).toBe(true);
  expect(statusRule("planned", [], undefined, "draft").ok).toBe(false);
});
