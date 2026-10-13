// Tests of the state tables of schema 2: each transition, and the rows that must not exist.

import { expect, test } from "bun:test";
import {
  CHANGE_STATES,
  CHANGE_TRANSITIONS,
  CLOSED_PACKAGE_STATES,
  hasTransition,
  isChangeState,
  isPackageState,
  PACKAGE_STATES,
  PACKAGE_TRANSITIONS,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/states.ts";
import {
  CHANGE_INITIAL,
  PACKAGE_INITIAL,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/status.ts";

const pkg = (from: string, command: string, to: string) =>
  hasTransition(PACKAGE_TRANSITIONS, { from, command, to } as never);
const change = (from: string, command: string, to: string) =>
  hasTransition(CHANGE_TRANSITIONS, { from, command, to } as never);

test("each package transition of the design exists", () => {
  const rows: [string, string, string][] = [
    ["planned", "implement", "doing"],
    ["doing", "verify", "verified"],
    ["doing", "verify", "doing"],
    ["doing", "implement", "doing"],
    ["verified", "review", "approved"],
    ["verified", "reject", "doing"],
    ["approved", "merge", "done"],
    ["blocked", "implement", "doing"],
  ];
  for (const [from, command, to] of rows)
    expect(pkg(from, command, to)).toBe(true);
});

test("each open package can be blocked and dropped, except a blocked one cannot be blocked", () => {
  for (const from of ["planned", "doing", "verified", "approved"]) {
    expect(pkg(from, "block", "blocked")).toBe(true);
    expect(pkg(from, "drop", "canceled")).toBe(true);
  }
  expect(pkg("blocked", "drop", "canceled")).toBe(true);
  expect(pkg("blocked", "block", "blocked")).toBe(false);
});

test("a closed package has no transition out", () => {
  for (const from of CLOSED_PACKAGE_STATES)
    expect(PACKAGE_TRANSITIONS.some((t) => t.from === from)).toBe(false);
});

test("no package skips a step", () => {
  expect(pkg("planned", "verify", "verified")).toBe(false);
  expect(pkg("doing", "review", "approved")).toBe(false);
  expect(pkg("verified", "merge", "done")).toBe(false);
  expect(pkg("approved", "merge", "doing")).toBe(false);
});

test("every package transition names known states", () => {
  for (const t of PACKAGE_TRANSITIONS) {
    expect(PACKAGE_STATES).toContain(t.from);
    expect(PACKAGE_STATES).toContain(t.to);
  }
});

test("each change transition of the design exists", () => {
  const rows: [string, string, string][] = [
    ["draft", "specify", "specified"],
    ["specified", "plan", "planned"],
    ["specified", "specify", "planned"],
    ["planned", "implement", "implementing"],
    ["implementing", "accept", "accepted"],
    ["accepted", "archive", "archived"],
  ];
  for (const [from, command, to] of rows)
    expect(change(from, command, to)).toBe(true);
});

test("a change drops from draft, specified, planned, and implementing only", () => {
  for (const from of ["draft", "specified", "planned", "implementing"])
    expect(change(from, "drop", "canceled")).toBe(true);
  for (const from of ["accepted", "archived", "canceled"])
    expect(
      CHANGE_TRANSITIONS.some((t) => t.from === from && t.to === "canceled"),
    ).toBe(false);
});

test("archived and canceled changes have no transition out", () => {
  for (const from of ["archived", "canceled"])
    expect(CHANGE_TRANSITIONS.some((t) => t.from === from)).toBe(false);
});

test("the state guards accept their own states only", () => {
  for (const s of PACKAGE_STATES) expect(isPackageState(s)).toBe(true);
  for (const s of CHANGE_STATES) expect(isChangeState(s)).toBe(true);
  expect(isPackageState("review")).toBe(false);
  expect(isPackageState("draft")).toBe(false);
  expect(isChangeState("doing")).toBe(false);
  expect(isChangeState(undefined)).toBe(false);
});

test("the initial states are the first states of the tables", () => {
  expect(PACKAGE_INITIAL).toBe(PACKAGE_STATES[0]);
  expect(CHANGE_INITIAL).toBe(CHANGE_STATES[0]);
});
