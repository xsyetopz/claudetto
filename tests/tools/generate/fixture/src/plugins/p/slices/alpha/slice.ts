// The fixture slice `alpha`: two mod handlers, one classic hook, a CLI, a skill, and a `userConfig` field.

import { onBash, onCompose } from "./adapters/mod.ts";

export const slice = {
  name: "alpha",
  mod: [
    {
      event: "tool.call",
      filter: { tool: "Bash" },
      phase: "check",
      run: onBash,
    },
    { event: "prompt.compose", phase: "rewrite", run: onCompose },
  ],
  hooks: [
    { event: "SessionStart", command: "true", timeout: 5 },
    { event: "PostToolUse", matcher: "Edit", command: "one", async: true },
  ],
  cli: { bin: "p-alpha" },
  userConfig: {
    mode: { type: "string", title: "Mode", default: "a", options: ["a", "b"] },
  },
};
