// The manifest of the slice `graph`: the command `dotclaude-codegraph-check`, two classic hooks, and one mod handler.
// `SessionStart` and the sync after an edit are classic hooks, because they run `codegraph` on Bun with the Windows handling of `adapters/codegraph.ts`.
// The sync after a `git` command is a mod handler, because a classic hook with an `if` for each `git` command needs 12 hooks, and one hook without `if` starts a process on each `Bash` call.

import type { Slice } from "../../../../kernel/slice.ts";
import { onTreeChange } from "./adapters/mod.ts";
import { TREE_CHANGE } from "./domain/graph.ts";
import { BACKGROUND_SYNC_TIMEOUT_MS } from "./limits.ts";

// The text `${CLAUDE_PLUGIN_ROOT}` stays in the command, and Claude Code fills it in at run time.
const HOOK = `bun --no-env-file "\${CLAUDE_PLUGIN_ROOT}/slices/graph/adapters/hook.ts"`;

export const slice: Slice = {
  name: "graph",
  cli: { bin: "dotclaude-codegraph-check" },
  hooks: [
    {
      event: "SessionStart",
      command: `${HOOK} session-start`,
      timeout: 10,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "tests/codegraph/session.test.ts > a project with no index: no hook runs a command or adds text",
        text: "tests/codegraph/session.test.ts > session start in an indexed project syncs and adds one line with the commands for callers, callees, and impact",
      },
    },
    {
      event: "PostToolUse",
      matcher: "Edit|Write|MultiEdit|NotebookEdit",
      command: `${HOOK} sync`,
      async: true,
      timeout: BACKGROUND_SYNC_TIMEOUT_MS / 1000,
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "tests/codegraph/sync.test.ts > the sync of a project with no index, or with no CLI, runs nothing and exits 0",
        text: "tests/codegraph/sync.test.ts > the command of a picked hook syncs an indexed project and prints nothing",
      },
    },
  ],
  mod: [
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow:
          "plugins/dotclaude-codegraph/tests/tree-change.test.ts > a `Bash` call of another command does not reach the hook",
        text: "plugins/dotclaude-codegraph/tests/tree-change.test.ts > a `git commit` call syncs an indexed project",
      },
      filter: { tool: "Bash", command: TREE_CHANGE },
      phase: "observe",
      run: onTreeChange,
    },
  ],
};
