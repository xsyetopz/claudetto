// Tests of the merge-done trigger (`domain/trigger.ts`).
// The hook lab cannot mark a `tool.call` as a call of a subagent, so the subagent case is tested here.

import { expect, test } from "bun:test";
import {
  isPhaseDone,
  phaseDoneCall,
} from "../../../src/plugins/dotclaude/slices/handoff/domain/trigger.ts";

test("a merge command in command position is merge-done, with or without a branch", () => {
  expect(isPhaseDone("dotclaude-spec merge P13")).toBe(true);
  expect(isPhaseDone("dotclaude-spec merge P13 branch")).toBe(true);
  expect(isPhaseDone("cd /p && ./bin/dotclaude-spec merge P13 branch")).toBe(
    true,
  );
  expect(isPhaseDone("CI=1 dotclaude-spec merge P13")).toBe(true);
});

test("another phase command, a bare merge, and a merge with extra arguments are not merge-done", () => {
  expect(isPhaseDone("dotclaude-spec review P13 approve")).toBe(false);
  expect(isPhaseDone("dotclaude-spec verify P13")).toBe(false);
  expect(isPhaseDone("dotclaude-spec merge")).toBe(false);
  expect(isPhaseDone("dotclaude-spec merge P13 branch extra")).toBe(false);
});

test("quoted text and arguments of another command are not merge-done", () => {
  expect(isPhaseDone('git commit -m "x; dotclaude-spec merge P1 b"')).toBe(
    false,
  );
  expect(isPhaseDone("echo dotclaude-spec merge P1")).toBe(false);
  expect(isPhaseDone("echo 'dotclaude-spec merge P1 b'")).toBe(false);
});

test("a merge command of a subagent does not set the trigger", () => {
  const command = "dotclaude-spec merge P13 branch";
  expect(phaseDoneCall({ tool: "Bash", command }, {})).toBe(true);
  expect(phaseDoneCall({ tool: "Bash", command, agentId: "a1" }, {})).toBe(
    false,
  );
});

test("a denied call, a failed call, and another tool do not set the trigger", () => {
  const command = "dotclaude-spec merge P13 branch";
  expect(phaseDoneCall({ tool: "Bash", command }, { deny: "no" })).toBe(false);
  expect(phaseDoneCall({ tool: "Bash", command }, { isError: true })).toBe(
    false,
  );
  expect(phaseDoneCall({ tool: "Read", command }, {})).toBe(false);
});
