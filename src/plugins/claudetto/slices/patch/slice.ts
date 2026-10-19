// The manifest of the `patch` slice: the `tool.call` hook that keeps one cumulative patch for each subagent in a worktree (design D64),
// the CLI `claudetto-patch` that lists and lands the patches, and the skill `patch` for the landing.
// The slice is not part of `handoff`, because that slice is about the compaction of the main thread.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import { onFileWrite } from "./adapters/mod.ts";

const LAB = "plugins/claudetto/tests/write.test.ts";

export const slice = {
  name: "patch",
  ladder:
    "mod: the `tool.call` hook, because no setting keeps the work of a subagent when its worktree is lost",
  controls: [
    {
      name: "cumulative patch",
      incident:
        "A turn limit and a weekly usage limit stopped three subagents in worktrees before they committed (2026-10-19, D64).",
      removeWhen:
        "Claude Code keeps the uncommitted work of a stopped subagent in a worktree.",
    },
  ],
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > an \`Edit\` of the main thread writes no patch`,
        text: `${LAB} > an \`Edit\` of a subagent in a worktree writes the base and the cumulative patch in the main checkout`,
      },
      filter: { tool: ["Edit", "Write"] },
      phase: "observe",
      run: onFileWrite as unknown as Handler<"tool.call">,
    },
  ],
  cli: { bin: "claudetto-patch" },
  skills: ["patch"],
} satisfies Slice;
