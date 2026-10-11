// Test of the claim-check `prompt` hook on `Stop` (design D27, task 18.14).
// It reads `hooks/hooks.json` and checks what Claude Code needs from a `prompt` hook.
// The model judges the claim, so no test pins the words of the prompt.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS } from "../support/repo.mjs";

const hooks = JSON.parse(
  readFileSync(path.join(PLUGINS, "dotclaude/hooks/hooks.json"), "utf8"),
);
const promptHooks = (event) =>
  (hooks.hooks[event] ?? [])
    .flatMap((group) => group.hooks)
    .filter((hook) => hook.type === "prompt");
const stop = promptHooks("Stop");

test("`Stop` has one `prompt` hook and `SubagentStop` has none", () => {
  assert.equal(stop.length, 1);
  assert.deepEqual(promptHooks("SubagentStop"), []);
});

test("each `Stop` prompt hook receives the hook input through `$ARGUMENTS`", () => {
  for (const hook of stop) assert.ok(hook.prompt.includes("$ARGUMENTS"));
});

test("each `Stop` prompt hook asks for the `ok` and `reason` answer that Claude Code reads", () => {
  for (const hook of stop) {
    assert.match(hook.prompt, /"ok"\s*:\s*true/);
    assert.match(hook.prompt, /"ok"\s*:\s*false/);
    assert.match(hook.prompt, /"reason"/);
  }
});

// The default evaluator wrote prose in place of the JSON answer in the Haiku eval run,
// and Claude Code then sent the hook prompt back to the session as feedback.
test("each `Stop` prompt hook names its evaluator `model`", () => {
  for (const hook of stop) assert.match(hook.model ?? "", /^claude-/);
});

// When the evaluator fails, Claude Code sends the prompt text to the session as `Stop hook feedback`,
// so the text must tell the session agent to send its report again.
test("each `Stop` prompt hook tells the session agent what to do when the prompt leaks to it", () => {
  for (const hook of stop) assert.match(hook.prompt, /`Stop hook feedback`/);
});

test("each `Stop` prompt hook has a time limit in seconds", () => {
  for (const hook of stop) {
    assert.ok(Number.isInteger(hook.timeout) && hook.timeout > 0, hook.timeout);
  }
});
