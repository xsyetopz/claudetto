// Test of the claim-check `prompt` hook on `Stop` (design D27, task 18.14).
// It reads `hooks/hooks.json` and checks what Claude Code needs from a `prompt` hook.
// The model judges the claim, so no test pins the words of the prompt.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS } from "../support/repo.ts";

/** The fields of a hook entry that the tests read. */
interface Hook {
  type: string;
  prompt: string;
  model?: string;
  timeout?: number;
}

/** The `hooks.json` of the core plugin: the hook groups of each event. */
interface Hooks {
  hooks: Record<string, { hooks: Hook[] }[]>;
}

const hooks: Hooks = await Bun.file(
  path.join(PLUGINS, "dotclaude/hooks/hooks.json"),
).json();
const promptHooks = (event: string) =>
  (hooks.hooks[event] ?? [])
    .flatMap((group) => group.hooks)
    .filter((hook) => hook.type === "prompt");
const stop = promptHooks("Stop");

test("`Stop` has one `prompt` hook and `SubagentStop` has none", () => {
  expect(stop.length).toBe(1);
  expect(promptHooks("SubagentStop")).toStrictEqual([]);
});

test("each `Stop` prompt hook receives the hook input through `$ARGUMENTS`", () => {
  for (const hook of stop)
    expect(hook.prompt.includes("$ARGUMENTS")).toBeTruthy();
});

test("each `Stop` prompt hook asks for the `ok` and `reason` answer that Claude Code reads", () => {
  for (const hook of stop) {
    expect(hook.prompt).toMatch(/"ok"\s*:\s*true/);
    expect(hook.prompt).toMatch(/"ok"\s*:\s*false/);
    expect(hook.prompt).toMatch(/"reason"/);
  }
});

// The default evaluator wrote prose in place of the JSON answer in the Haiku eval run,
// and Claude Code then sent the hook prompt back to the session as feedback.
test("each `Stop` prompt hook names its evaluator `model`", () => {
  for (const hook of stop) expect(hook.model ?? "").toMatch(/^claude-/);
});

// When the evaluator fails, Claude Code sends the prompt text to the session as `Stop hook feedback`,
// so the text must tell the session agent to send its report again.
test("each `Stop` prompt hook tells the session agent what to do when the prompt leaks to it", () => {
  for (const hook of stop) expect(hook.prompt).toMatch(/`Stop hook feedback`/);
});

test("each `Stop` prompt hook has a time limit in seconds", () => {
  for (const hook of stop) {
    expect(
      hook.timeout !== undefined &&
        Number.isInteger(hook.timeout) &&
        hook.timeout > 0,
      String(hook.timeout),
    ).toBeTruthy();
  }
});
