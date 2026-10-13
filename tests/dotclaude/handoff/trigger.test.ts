// Tests of the merge-done trigger (`domain/trigger.ts`).
// The hook lab cannot mark a `tool.call` as a call of a subagent, so the subagent case is tested here.

import { expect, test } from "bun:test";
import {
  isMergeDone,
  mergeDoneCall,
} from "../../../src/plugins/dotclaude/slices/handoff/domain/trigger.ts";

test("a merge command in command position is merge-done, with or without a branch", () => {
  expect(isMergeDone("dotclaude-spec merge P13")).toBe(true);
  expect(isMergeDone("dotclaude-spec merge P13 branch")).toBe(true);
  expect(isMergeDone("cd /p && ./bin/dotclaude-spec merge P13 branch")).toBe(
    true,
  );
  expect(isMergeDone("CI=1 dotclaude-spec merge P13")).toBe(true);
});

test("another phase command, a bare merge, and a merge with extra arguments are not merge-done", () => {
  expect(isMergeDone("dotclaude-spec review P13 approve")).toBe(false);
  expect(isMergeDone("dotclaude-spec verify P13")).toBe(false);
  expect(isMergeDone("dotclaude-spec merge")).toBe(false);
  expect(isMergeDone("dotclaude-spec merge P13 branch extra")).toBe(false);
});

test("quoted text and arguments of another command are not merge-done", () => {
  expect(isMergeDone('git commit -m "x; dotclaude-spec merge P1 b"')).toBe(
    false,
  );
  expect(isMergeDone("echo dotclaude-spec merge P1")).toBe(false);
  expect(isMergeDone("echo 'dotclaude-spec merge P1 b'")).toBe(false);
});

test("a merge command of a subagent does not set the trigger", () => {
  const command = "dotclaude-spec merge P13 branch";
  expect(mergeDoneCall({ tool: "Bash", command }, {})).toBe(true);
  expect(mergeDoneCall({ tool: "Bash", command, agentId: "a1" }, {})).toBe(
    false,
  );
});

test("a denied call, a failed call, and another tool do not set the trigger", () => {
  const command = "dotclaude-spec merge P13 branch";
  expect(mergeDoneCall({ tool: "Bash", command }, { deny: "no" })).toBe(false);
  expect(mergeDoneCall({ tool: "Bash", command }, { isError: true })).toBe(
    false,
  );
  expect(mergeDoneCall({ tool: "Read", command }, {})).toBe(false);
});
