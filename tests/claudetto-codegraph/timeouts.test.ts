// The waits of the hooks of claudetto-codegraph, against the hook timeout that Claude Code gives each of them.
// On Windows a sync also waits for the grace of `run-tree.ts`, so that total is the one that must fit.

import { expect, test } from "bun:test";
import {
  BACKGROUND_HOOK_TIMEOUT_S,
  BACKGROUND_SYNC_TIMEOUT_MS,
  GIT_RUN_TIMEOUT_MS,
  GIT_SYNC_TIMEOUT_MS,
  HOOK_MARGIN_MS,
  LOCK_STALE_MS,
  SESSION_START_HOOK_TIMEOUT_S,
  START_SYNC_TIMEOUT_MS,
  TREE_GRACE_MS,
} from "../../plugins/claudetto-codegraph/slices/graph/limits.ts";
import { slice } from "../../plugins/claudetto-codegraph/slices/graph/slice.ts";

const hookOf = (event: string) => slice.hooks?.find((h) => h.event === event);

test("each hook has the timeout that its bound names", () => {
  expect(hookOf("SessionStart")?.timeout).toBe(SESSION_START_HOOK_TIMEOUT_S);
  expect(hookOf("PostToolUse")?.timeout).toBe(BACKGROUND_HOOK_TIMEOUT_S);
});

test("the sync at session start, with the Windows grace and the margin, fits the hook timeout", () => {
  expect(
    START_SYNC_TIMEOUT_MS + TREE_GRACE_MS + HOOK_MARGIN_MS,
  ).toBeLessThanOrEqual(SESSION_START_HOOK_TIMEOUT_S * 1000);
});

test("the sync after an edit, with the Windows grace and the margin, fits the hook timeout", () => {
  expect(
    BACKGROUND_SYNC_TIMEOUT_MS + TREE_GRACE_MS + HOOK_MARGIN_MS,
  ).toBeLessThanOrEqual(BACKGROUND_HOOK_TIMEOUT_S * 1000);
});

test("the process of the sync after a `git` command outlives the sync it runs", () => {
  expect(GIT_RUN_TIMEOUT_MS).toBeGreaterThanOrEqual(
    GIT_SYNC_TIMEOUT_MS + TREE_GRACE_MS + HOOK_MARGIN_MS,
  );
});

test("a lock counts as stale only after the longest sync could end", () => {
  expect(LOCK_STALE_MS).toBeGreaterThan(
    BACKGROUND_SYNC_TIMEOUT_MS + TREE_GRACE_MS,
  );
});
