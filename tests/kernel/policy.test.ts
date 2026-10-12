// Tests of the rule catalog of the destructive floor: each id is unique, each rule has a tier and prose, and each id the hook run keys is present.

import { expect, test } from "bun:test";
import { ANY_ROUTE } from "../../src/kernel/policy/route.ts";
import { POLICY_RULES, prosesOf } from "../../src/kernel/policy/index.ts";

const TIERS = ["floor", "ask", "subagent"];

const REQUIRED_IDS = [
  "git.discard-uncommitted",
  "git.clean",
  "git.stash-drop",
  "git.history-rewrite",
  "git.force-push-default",
  "git.delete-branch",
  "git.delete-repo",
  "git.shared-checkout",
  "system.recursive-delete",
  "system.disk",
  "system.permissions",
  "system.security",
  "db.drop",
  "db.truncate",
  "db.unscoped-write",
  "db.reset",
  "db.flush",
  "db.delete-files",
  "cloud.destroy",
  "backups.delete",
];

test("each rule id is unique", () => {
  const ids = POLICY_RULES.map((rule) => rule.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("each rule has a known tier, a category, and non-empty prose", () => {
  for (const rule of POLICY_RULES) {
    expect(TIERS, rule.id).toContain(rule.tier);
    expect(rule.category, rule.id).not.toBe("");
    expect(rule.prose.trim(), rule.id).not.toBe("");
  }
});

test("each forbidden rule says that a wrapper or an indirection does not get past it", () => {
  for (const rule of POLICY_RULES.filter((r) => r.tier !== "ask"))
    expect(rule.prose.endsWith(ANY_ROUTE), rule.id).toBe(true);
});

test("the catalog holds each id that the hook run keys", () => {
  const ids = new Set(POLICY_RULES.map((rule) => rule.id));
  for (const id of REQUIRED_IDS) expect(ids.has(id), id).toBe(true);
});

test("`prosesOf` gives the prose of each rule of one tier, in catalog order", () => {
  const floor = POLICY_RULES.filter((r) => r.tier === "floor").map(
    (r) => r.prose,
  );
  expect(prosesOf("floor")).toStrictEqual(floor);
  expect(prosesOf("ask").length).toBe(
    POLICY_RULES.filter((r) => r.tier === "ask").length,
  );
});
