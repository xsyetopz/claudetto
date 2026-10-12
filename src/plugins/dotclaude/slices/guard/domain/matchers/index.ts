// The catalog of the `guard` matchers: each matcher of `git.ts` and `system.ts`, and the tier of each id.
// The tiers move to the kernel catalog `src/kernel/policy/` when P37 merges, so this map is local until then.

import { gitMatchers } from "./git.ts";
import { systemMatchers } from "./system.ts";
import type { Matcher, Tier } from "./types.ts";

export const MATCHERS: Matcher[] = [...gitMatchers, ...systemMatchers];

/** The tier of each matcher id: `floor` applies in every session, and `subagent` only in a subagent. */
export const TIERS: Record<string, Tier> = {
  "git.discard-uncommitted": "floor",
  "git.clean": "floor",
  "git.stash-drop": "floor",
  "git.history-rewrite": "floor",
  "git.force-push-default": "floor",
  "git.delete-branch": "floor",
  "git.shared-checkout": "subagent",
  "system.recursive-delete": "floor",
  "system.disk": "floor",
  "system.permissions": "floor",
  "system.security": "floor",
};
