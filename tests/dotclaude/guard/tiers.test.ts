// Tests of the tiers of the `guard` matchers: each matcher id has a rule in the kernel catalog, and the guard tier of the id equals the catalog tier (spec P37, step 2).
// A matcher with no catalog entry fails its test, because the guard tier then falls back to `floor` and the catalog would not agree.

import { expect, test } from "bun:test";
import { POLICY_RULES } from "../../../src/kernel/policy/index.ts";
import {
  MATCHERS,
  tierOf,
} from "../../../src/plugins/dotclaude/slices/guard/domain/matchers/index.ts";

for (const matcher of MATCHERS) {
  test(`the matcher \`${matcher.id}\` has an entry in the rule catalog`, () => {
    expect(POLICY_RULES.map((rule) => rule.id)).toContain(matcher.id);
  });

  test(`the guard tier of \`${matcher.id}\` equals its catalog tier`, () => {
    const catalog = POLICY_RULES.map((rule) => [rule.id, rule.tier]);
    expect(catalog).toContainEqual([matcher.id, tierOf(matcher.id)]);
  });
}
