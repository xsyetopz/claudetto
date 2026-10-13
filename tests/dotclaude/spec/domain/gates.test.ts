// Tests of the gates: a pass and a refusal for each rule.

import { expect, test } from "bun:test";
import {
  gateAccept,
  gateArchive,
  gatePlan,
  gateSpecified,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/change-gates.ts";
import {
  gateApprove,
  gateImplement,
  gateMerge,
  gateReason,
  gateReject,
  gateVerify,
  type ImplementFacts,
  verifyTarget,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/gates.ts";

const base: ImplementFacts = {
  from: "planned",
  change: "planned",
  depsDone: true,
  openMarkers: 0,
};
const ok = (r: { ok: boolean }) => r.ok;

test("implement from planned needs a planned or implementing change", () => {
  expect(ok(gateImplement(base))).toBe(true);
  expect(ok(gateImplement({ ...base, change: "implementing" }))).toBe(true);
  for (const change of [
    "draft",
    "specified",
    "accepted",
    "archived",
    "canceled",
  ] as const)
    expect(ok(gateImplement({ ...base, change }))).toBe(false);
});

test("implement from planned needs done dependencies and no open marker", () => {
  expect(ok(gateImplement({ ...base, depsDone: false }))).toBe(false);
  expect(ok(gateImplement({ ...base, openMarkers: 1 }))).toBe(false);
});

test("implement from blocked needs a note", () => {
  const blocked = { ...base, from: "blocked" } as const;
  expect(ok(gateImplement(blocked))).toBe(false);
  expect(ok(gateImplement({ ...blocked, note: "  " }))).toBe(false);
  expect(ok(gateImplement({ ...blocked, note: "the cause is fixed" }))).toBe(
    true,
  );
});

const at = "2026-10-13T10:00:00.000Z";
const failedVerify = [
  { at, package: "P1", state: "doing", verify: { command: "x", exit: 1 } },
];
const rejected = [
  { at, package: "P1", state: "doing", verdict: "reject" as const },
];

test("implement from doing needs a failed verify or a reject, and a decision", () => {
  const doing = { ...base, from: "doing", events: failedVerify } as const;
  expect(ok(gateImplement(doing))).toBe(false);
  expect(ok(gateImplement({ ...doing, decision: "fix-code" }))).toBe(true);
  expect(ok(gateImplement({ ...doing, decision: "revise-spec" }))).toBe(true);
  const after = { ...doing, events: rejected, decision: "fix-code" } as const;
  expect(ok(gateImplement(after))).toBe(true);
});

test("implement from doing with a decision and no failed verify or reject is refused", () => {
  const doing = { ...base, from: "doing", decision: "fix-code" } as const;
  expect(ok(gateImplement(doing))).toBe(false);
  const started = [{ at, package: "P1", state: "doing" }];
  expect(ok(gateImplement({ ...doing, events: started }))).toBe(false);
});

test("verify needs a command, an integer exit, and the head of the branch", () => {
  const facts = { command: "just check", exit: 0, sha: "a1", head: "a1" };
  expect(ok(gateVerify(facts))).toBe(true);
  expect(ok(gateVerify({ ...facts, exit: 2 }))).toBe(true);
  expect(ok(gateVerify({ ...facts, command: " " }))).toBe(false);
  expect(ok(gateVerify({ ...facts, exit: 0.5 }))).toBe(false);
  expect(ok(gateVerify({ ...facts, head: "b2" }))).toBe(false);
  expect(ok(gateVerify({ ...facts, sha: "", head: "" }))).toBe(false);
});

test("verify moves to verified on exit 0 and stays in doing otherwise", () => {
  expect(verifyTarget(0)).toBe("verified");
  expect(verifyTarget(1)).toBe("doing");
});

test("approve needs a last verify event with the exit status 0 and a SHA", () => {
  const verify = (exit: number, sha?: string) => ({
    at,
    package: "P1",
    state: "verified",
    verify: { command: "x", exit },
    ...(sha === undefined ? {} : { sha }),
  });
  expect(ok(gateApprove({ verify: verify(0, "a1") }))).toBe(true);
  expect(ok(gateApprove({ verify: verify(0) }))).toBe(false);
  expect(ok(gateApprove({ verify: verify(1, "a1") }))).toBe(false);
  expect(ok(gateApprove({ verify: undefined }))).toBe(false);
});

test("reject needs a finding and a decision", () => {
  expect(ok(gateReject({ findings: ["bug"], decision: "fix-code" }))).toBe(
    true,
  );
  expect(ok(gateReject({ findings: [], decision: "fix-code" }))).toBe(false);
  expect(ok(gateReject({ findings: [" "], decision: "fix-code" }))).toBe(false);
  expect(ok(gateReject({ findings: ["bug"] }))).toBe(false);
});

test("merge with a branch needs the approved SHA at its head", () => {
  expect(
    ok(gateMerge({ approvedSha: "a1", branchHead: "a1", mainContains: false })),
  ).toBe(true);
  expect(
    ok(gateMerge({ approvedSha: "a1", branchHead: "b2", mainContains: true })),
  ).toBe(false);
});

test("merge with no branch needs HEAD of the main checkout to contain the SHA", () => {
  expect(ok(gateMerge({ approvedSha: "a1", mainContains: true }))).toBe(true);
  expect(ok(gateMerge({ approvedSha: "a1", mainContains: false }))).toBe(false);
});

test("block and drop need a non-empty text", () => {
  expect(ok(gateReason("waits for a key", "block"))).toBe(true);
  expect(ok(gateReason("  ", "drop"))).toBe(false);
  expect(ok(gateReason(undefined, "drop"))).toBe(false);
});

test("specify needs valid IDs and no open marker", () => {
  expect(ok(gateSpecified({ badIds: 0, openMarkers: 0 }))).toBe(true);
  expect(ok(gateSpecified({ badIds: 1, openMarkers: 0 }))).toBe(false);
  expect(ok(gateSpecified({ badIds: 0, openMarkers: 1 }))).toBe(false);
});

test("plan needs valid packages, full coverage, and known IDs", () => {
  const facts = { packageErrors: 0, uncovered: [], unknown: [] };
  expect(ok(gatePlan(facts))).toBe(true);
  expect(ok(gatePlan({ ...facts, packageErrors: 1 }))).toBe(false);
  expect(ok(gatePlan({ ...facts, uncovered: ["REQ-1"] }))).toBe(false);
  expect(ok(gatePlan({ ...facts, unknown: ["REQ-9"] }))).toBe(false);
});

test("accept needs each package closed", () => {
  expect(ok(gateAccept({ packages: ["done", "canceled"] }))).toBe(true);
  expect(ok(gateAccept({ packages: ["done", "approved"] }))).toBe(false);
});

test("archive needs an accepted change", () => {
  expect(ok(gateArchive("accepted"))).toBe(true);
  for (const s of ["draft", "specified", "planned", "implementing", "archived"])
    expect(ok(gateArchive(s))).toBe(false);
});
