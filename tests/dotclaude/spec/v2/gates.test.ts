// Tests of the gates of schema 2: a pass and a refusal for each rule.

import { expect, test } from "bun:test";
import {
  gateAccept,
  gateArchive,
  gatePlan,
  gateSpecified,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/change-gates.ts";
import {
  gateApprove,
  gateImplement,
  gateMerge,
  gateReason,
  gateReject,
  gateVerify,
  type ImplementFacts,
  verifyTarget,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/v2/gates.ts";

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

test("implement from doing needs a decision", () => {
  const doing = { ...base, from: "doing" } as const;
  expect(ok(gateImplement(doing))).toBe(false);
  expect(ok(gateImplement({ ...doing, decision: "fix-code" }))).toBe(true);
  expect(ok(gateImplement({ ...doing, decision: "revise-spec" }))).toBe(true);
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

test("approve records the SHA of the last verify event", () => {
  expect(ok(gateApprove({ verifySha: "a1", approveSha: "a1" }))).toBe(true);
  expect(ok(gateApprove({ verifySha: "a1", approveSha: "b2" }))).toBe(false);
  expect(ok(gateApprove({ verifySha: undefined, approveSha: "a1" }))).toBe(
    false,
  );
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

test("accept needs each package closed and a clean trace", () => {
  const facts = {
    packages: ["done", "canceled"] as const,
    orphans: 0,
    uncited: 0,
  };
  expect(ok(gateAccept({ ...facts, packages: [...facts.packages] }))).toBe(
    true,
  );
  expect(ok(gateAccept({ ...facts, packages: ["done", "approved"] }))).toBe(
    false,
  );
  expect(ok(gateAccept({ ...facts, packages: [], orphans: 1 }))).toBe(false);
  expect(ok(gateAccept({ ...facts, packages: [], uncited: 1 }))).toBe(false);
});

test("archive needs an accepted change", () => {
  expect(ok(gateArchive("accepted"))).toBe(true);
  for (const s of ["draft", "specified", "planned", "implementing", "archived"])
    expect(ok(gateArchive(s))).toBe(false);
});
