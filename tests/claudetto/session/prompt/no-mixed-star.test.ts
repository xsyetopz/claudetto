// No rule of the snippet mixes `*` with a trailing `:*`: Claude Code reads such a rule as a literal prefix, so it matches nothing (task 13.17).

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../../plugins/claudetto/snippets.ts";
import {
  bashPattern,
  mixesStarWithPrefix,
} from "../../../support/bash-rules.ts";

const permissions = (
  SNIPPET as unknown as { permissions: Record<string, string[]> }
).permissions;

test("no `allow`, `ask`, or `deny` rule of the snippet mixes `*` with a trailing `:*`", () => {
  const rules = Object.values(permissions).flat();
  expect(rules.length).toBeGreaterThan(0);
  expect(
    rules.filter((rule) => mixesStarWithPrefix(bashPattern(rule) ?? "")),
  ).toStrictEqual([]);
});

test("the check finds `git push* :*` and passes `git push* :* *` and `git:*`", () => {
  expect(mixesStarWithPrefix("git push* :*")).toBe(true);
  expect(mixesStarWithPrefix("git push* :* *")).toBe(false);
  expect(mixesStarWithPrefix("git:*")).toBe(false);
});
