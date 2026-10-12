// The fixture slice `beta`: mod handlers in the phases before, at, and after those of `alpha`, and one classic hook.

import { onBash, onCompose, onWrite } from "./adapters/mod.ts";

export const slice = {
  name: "beta",
  mod: [
    {
      event: "tool.call",
      filter: { tool: "Write", input: { file_path: /\.md$/ } },
      phase: "answer",
      run: onWrite,
    },
    { event: "prompt.compose", phase: "rewrite", run: onCompose },
    {
      event: "tool.call",
      filter: { tool: "Bash" },
      phase: "observe",
      run: onBash,
    },
  ],
  hooks: [{ event: "PostToolUse", matcher: "Edit", command: "two" }],
};
