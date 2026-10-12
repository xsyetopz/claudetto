// The `guard` matchers: each matcher of `git.ts` and `system.ts`.
// The tier of each matcher id comes from the kernel rule catalog `src/kernel/policy/`.

import { POLICY_RULES } from "../../../../../../kernel/policy/index.ts";
import { gitMatchers } from "./git.ts";
import { systemMatchers } from "./system.ts";
import type { Matcher, Tier } from "./types.ts";

export const MATCHERS: Matcher[] = [...gitMatchers, ...systemMatchers];

/**
 * The tier of a matcher id from the catalog: `subagent` when the catalog says so, and `floor` otherwise.
 * A matcher with no catalog entry gets `floor`, which applies in every session, and the guard test fails for it.
 */
export const tierOf = (id: string): Tier =>
  POLICY_RULES.find((rule) => rule.id === id)?.tier === "subagent"
    ? "subagent"
    : "floor";
