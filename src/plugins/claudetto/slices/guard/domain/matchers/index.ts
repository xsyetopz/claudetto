// The `guard` matchers: each matcher of `git.ts` and `system.ts`.

import { gitMatchers } from "./git.ts";
import { systemMatchers } from "./system.ts";
import type { Matcher, Tier } from "./types.ts";

export const MATCHERS: Matcher[] = [...gitMatchers, ...systemMatchers];

/** The tier of a matcher id: `subagent` for the shared-checkout rule, and `floor` for each other. */
export const tierOf = (id: string): Tier =>
  id === "git.shared-checkout" ? "subagent" : "floor";
