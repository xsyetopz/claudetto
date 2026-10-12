// The manifest of the slice `graph`: the command `dotclaude-codegraph-check`, two classic hooks, and one mod handler.
// `SessionStart` and the sync after an edit are classic hooks, because they run `codegraph` on Bun with the Windows handling of `adapters/codegraph.ts`.
// The sync after a `git` command is a mod handler, because a classic hook with an `if` for each `git` command needs 12 hooks, and one hook without `if` starts a process on each `Bash` call.

import type { Slice } from "../../../../kernel/slice.ts";
import { TREE_CHANGE } from "./domain/graph.ts";
import { onTreeChange } from "./adapters/mod.ts";
import { BACKGROUND_SYNC_TIMEOUT_MS } from "./limits.ts";

const HOOK = 'bun --no-env-file "${CLAUDE_PLUGIN_ROOT}/slices/graph/adapters/hook.ts"';

export const slice: Slice = {
  name: "graph",
  cli: { bin: "dotclaude-codegraph-check" },
  hooks: [
    {
      event: "SessionStart",
      command: `${HOOK} session-start`,
      timeout: 10,
    },
    {
      event: "PostToolUse",
      matcher: "Edit|Write|MultiEdit|NotebookEdit",
      command: `${HOOK} sync`,
      async: true,
      timeout: BACKGROUND_SYNC_TIMEOUT_MS / 1000,
    },
  ],
  mod: [
    {
      event: "tool.call",
      filter: { tool: "Bash", command: TREE_CHANGE },
      phase: "observe",
      run: onTreeChange,
    },
  ],
};
