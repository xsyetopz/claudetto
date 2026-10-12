// Lab tests of the `tool.call` hook on `Bash` of the `guard` slice: the main session keeps the git commands that change the shared checkout (spec P35, step 4).
// The lab cannot mark a call as a subagent's call, so the subagent deny is tested in `tests/dotclaude/guard/shared-git.test.ts`.
// No command runs.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const GIT = [
  "git stash",
  "git stash pop",
  "git reset --hard",
  "git clean -fd",
  "git checkout HEAD~1 -- .",
  "git restore --source=HEAD~1 .",
];

test("the main session is not denied for the shared-state git commands", async ($: Engine, on: On) => {
  on("tool.call", () => ({ result: "ok" }));
  for (const command of GIT) {
    const out = await $.tool.call({ tool: "Bash", command });
    expect("deny" in out, command).toBe(false);
  }
});
