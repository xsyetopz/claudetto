// Tests of the lane-done trigger (`domain/trigger.ts`).
// The hook lab cannot mark a `tool.call` as a call of a subagent, so the subagent case is tested here.

import { expect, test } from "bun:test";
import {
  isLaneDone,
  laneDoneCall,
} from "../../../src/plugins/dotclaude/slices/handoff/domain/trigger.ts";

test("a lane command and a merge command in command position are lane-done", () => {
  expect(isLaneDone("dotclaude-spec lane P13 done")).toBe(true);
  expect(isLaneDone("dotclaude-spec merge P13 branch")).toBe(true);
  expect(isLaneDone("cd /p && ./bin/dotclaude-spec lane P13 done")).toBe(true);
  expect(isLaneDone("CI=1 dotclaude-spec lane P13 done")).toBe(true);
});

test("a lane move to a lane other than `done` is not lane-done", () => {
  expect(isLaneDone("dotclaude-spec lane P13 review")).toBe(false);
  expect(isLaneDone("dotclaude-spec merge P13")).toBe(false);
});

test("quoted text and arguments of another command are not lane-done", () => {
  expect(isLaneDone('git commit -m "x; dotclaude-spec lane P1 done"')).toBe(
    false,
  );
  expect(isLaneDone("echo dotclaude-spec lane P1 done")).toBe(false);
  expect(isLaneDone("echo 'dotclaude-spec merge P1 b'")).toBe(false);
});

test("a lane command of a subagent does not set the trigger", () => {
  const command = "dotclaude-spec lane P13 done";
  expect(laneDoneCall({ tool: "Bash", command }, {})).toBe(true);
  expect(laneDoneCall({ tool: "Bash", command, agentId: "a1" }, {})).toBe(
    false,
  );
});

test("a denied call, a failed call, and another tool do not set the trigger", () => {
  const command = "dotclaude-spec lane P13 done";
  expect(laneDoneCall({ tool: "Bash", command }, { deny: "no" })).toBe(false);
  expect(laneDoneCall({ tool: "Bash", command }, { isError: true })).toBe(
    false,
  );
  expect(laneDoneCall({ tool: "Read", command }, {})).toBe(false);
});
