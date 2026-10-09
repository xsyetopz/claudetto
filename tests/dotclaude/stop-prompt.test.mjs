// Test of the claim-check `prompt` hook on `Stop` (design D27, task 18.14).
// It reads `hooks/hooks.json` and checks the shape of the hook.

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const hooks = JSON.parse(
  readFileSync("plugins/dotclaude/hooks/hooks.json", "utf8"),
);
const stopPrompts = (event) =>
  (hooks.hooks[event] ?? [])
    .flatMap((group) => group.hooks)
    .filter((hook) => hook.type === "prompt");

test("`Stop` has one `prompt` hook and `SubagentStop` has none", () => {
  expect(stopPrompts("Stop")).toHaveLength(1);
  expect(stopPrompts("SubagentStop")).toHaveLength(0);
});
