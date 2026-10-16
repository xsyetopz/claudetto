// Test 9.5, and test 4.4 of the `Bash` text: the `surface` slice never sets `isDeferred` to `false`, and its filter lists the ids of its transforms.
// The engine defers the tools that it can only when none of the env keys of `deferred-tools.test.ts` sends every tool schema in full.

import { expect, test } from "bun:test";
import {
  TOOL_TRANSFORMS,
  toolAnswer,
} from "../../../plugins/claudetto/slices/surface/domain/tools.ts";
import { slice } from "../../../plugins/claudetto/slices/surface/slice.ts";
import { bashText } from "../../../plugins/claudetto/slices/surface/transforms/Bash.ts";

test("`tool.describe` rules defer the listed tools and never set `isDeferred` to `false`", () => {
  const tools = [...TOOL_TRANSFORMS.map((t) => t.id), "SomethingNew"];
  for (const tool of tools)
    for (const description of ["x", "x".repeat(4000)]) {
      const answer = toolAnswer(tool, { description });
      expect(answer?.isDeferred, tool).not.toBe(false);
    }
  for (const { id } of TOOL_TRANSFORMS.filter((t) => t.defer))
    expect(toolAnswer(id, { description: "x" })?.isDeferred, id).toBe(true);
});

test("the filter of the `tool.describe` handler lists the ids of the transforms", () => {
  const handler = slice.mod.find((h) => h.event === "tool.describe");
  const ids = TOOL_TRANSFORMS.map((t) => t.id);
  expect(handler?.filter).toStrictEqual({ tool: ids });
});

const BUILT_IN_BASH = [
  "Executes a bash command and returns its output.",
  "",
  "This tool runs Git Bash (POSIX sh), not cmd.exe or PowerShell.",
  "",
  "- Command output is displayed to you, not reliably to the user.",
  "- `timeout` is in milliseconds: default 30000, max 90000 for a foreground command.",
  "- `run_in_background` runs the command detached. No `&` needed.",
  "",
  "# Machines",
  "- When this session lists another machine, run the command there.",
].join("\n");

test("the `Bash` text copies each part that Claude Code computes from the built-in text", () => {
  const text = bashText(`${BUILT_IN_BASH}\n${"x".repeat(4000)}`);
  expect(text).toContain("default 30000, max 90000 for a foreground command.");
  expect(text).toContain("This tool runs Git Bash (POSIX sh)");
  expect(text).toContain("- `run_in_background` runs the command detached.");
  expect(text).toContain(
    "# Machines\n- When this session lists another machine",
  );
  expect(text).not.toContain("120000");
});

test("the `Bash` text removes each slot that has no part in the built-in text", () => {
  const text = bashText("Executes a bash command and returns its output.");
  expect(text).not.toMatch(/\{\w+\}|timeout|Git Bash|# Machines/);
  expect(text).toContain("# Git");
});
