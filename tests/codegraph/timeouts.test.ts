// The waits of the `SessionStart` sync of dotclaude-codegraph, against the hook timeout that Claude Code gives it.
// On Windows the sync also waits for the grace of `run-tree.ts`, so that total is the one that must fit.

import { expect, test } from "bun:test";
import {
  SESSION_START_HOOK_TIMEOUT_S,
  START_SYNC_TIMEOUT_MS,
  TREE_GRACE_MS,
} from "../../plugins/dotclaude-codegraph/slices/graph/limits.ts";
import { slice } from "../../plugins/dotclaude-codegraph/slices/graph/slice.ts";

const SAFETY_MS = 1000;

test("the SessionStart hook has the timeout that its bound names", () => {
  const hook = slice.hooks?.find((h) => h.event === "SessionStart");
  expect(hook?.timeout).toBe(SESSION_START_HOOK_TIMEOUT_S);
});

test("the sync at session start on Linux and macOS ends at least 1 s before the hook timeout", () => {
  const hookMs = SESSION_START_HOOK_TIMEOUT_S * 1000;
  expect(START_SYNC_TIMEOUT_MS).toBeLessThanOrEqual(hookMs - SAFETY_MS);
});

test("the sync at session start on Windows, with its grace, ends at least 1 s before the hook timeout", () => {
  const hookMs = SESSION_START_HOOK_TIMEOUT_S * 1000;
  expect(START_SYNC_TIMEOUT_MS + TREE_GRACE_MS).toBeLessThanOrEqual(
    hookMs - SAFETY_MS,
  );
});
