// The mod handler of the `graph` slice: a `tool.call` on a `Bash` command with a `git` command that changes the tree syncs the index after the command.
// The filter in `slice.ts` is every `Bash` call, and `changesTree` reads the command with the shell parser of the kernel, in process, so a `Bash` call of any other kind starts no process.
// This replaces 12 classic `PostToolUse` hooks, each with an `if` for one `git` command.
// The sync runs with `$.process.run` and no shell, in a project with `.codegraph/codegraph.db` only.
// It runs `hook.ts sync-git`, not `codegraph`, so it takes the same lock as the other syncs and one sync runs at a time.
// The hook fails open: a missing `codegraph`, a timeout, or a deny of the call adds nothing and never changes the result of the call.
// Each `$` call is in this file, because `$` is not followed across an import.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { changesTree, INDEX_PATH } from "../domain/graph.ts";
import { GIT_RUN_TIMEOUT_MS } from "../limits.ts";

/**
 * The `next` of a `tool.call` hook, with a method signature so that its parameter is bivariant.
 * The generated `register` passes this handler to `on` with the filter of `slice.ts`, which gives `next` the narrow type of that call.
 * The generator does not narrow the handler type, so the method signature lets both `next` types fit.
 */
type PassOn = {
  pass(
    e: Parameters<Parameters<Handler<"tool.call">>[2]>[0],
  ): ReturnType<Parameters<Handler<"tool.call">>[2]>;
}["pass"];

/** The project folder: `CLAUDE_PROJECT_DIR`, or the folder of the session. */
const projectRoot = async ($: EngineInterface): Promise<string> =>
  (await $.env.get("CLAUDE_PROJECT_DIR")) || ".";

/** Syncs the index when the project has one. The catch has no narrower test, because `$.process.run` documents no error type. */
const syncIndex = async ($: EngineInterface): Promise<void> => {
  const root = await projectRoot($);
  if (!(await $.fs.exists(`${root}/${INDEX_PATH}`))) return;
  try {
    await $.process.run(
      [
        "bun",
        "--no-env-file",
        `${$.plugin.root}/slices/graph/adapters/hook.ts`,
        "sync-git",
      ],
      {
        cwd: root,
        stdin: JSON.stringify({ cwd: root }),
        timeoutMs: GIT_RUN_TIMEOUT_MS,
      },
    );
  } catch {
    // A missing `bun` or a timeout leaves the index as it is. The next sync catches up.
  }
};

/** The `tool.call` handler on a `git` command that changes the tree. It runs the command, then syncs the index. */
export const onTreeChange = async (
  $: EngineInterface,
  e: Parameters<Handler<"tool.call">>[1],
  next: PassOn,
) => {
  const out = await next(e);
  if (out.deny === undefined && e.tool === "Bash" && changesTree(e.command))
    await syncIndex($);
  return out;
};
