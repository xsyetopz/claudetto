// The classic command hooks of the add-on, through the `codegraph` CLI.
//
//   bun hook.ts session-start   SessionStart: sync the index, and add one line about the graph
//   bun hook.ts sync            PostToolUse: sync the index after an edit (async hook)
//   bun hook.ts sync-git        The same sync with the shorter bound of `GIT_SYNC_TIMEOUT_MS`, which the mod handler of `mod.ts` runs
//
// Each hook runs only in a project with `.codegraph/codegraph.db`, and else it prints nothing.
// Each hook fails open: on an error or a timeout it adds nothing and never blocks a call.
// A payload that is not JSON is ignored, and any other error is written to stderr, with exit code 0.
// Each sync goes through `lock.ts`, so one sync runs on one index at a time.
// The sync after a `git` command is a mod handler in `mod.ts`, so a `Bash` call starts no process here unless the command changes the tree.

import { failureDetail, type HookPayload, parseJson } from "../domain/graph.ts";
import {
  BACKGROUND_SYNC_TIMEOUT_MS,
  GIT_SYNC_TIMEOUT_MS,
  START_SYNC_TIMEOUT_MS,
} from "../limits.ts";
import { SESSION_LINE, SESSION_SYNC_FAILED } from "../prompts.ts";
import { indexed, rootOf } from "./codegraph.ts";
import { syncOnce } from "./lock.ts";

const context = (hookEventName: string, additionalContext: string) => ({
  hookSpecificOutput: { hookEventName, additionalContext },
});

/**
 * The `SessionStart` output: sync the index, then add the line.
 * Nothing when the project has no index or the CLI is missing.
 * A sync that failed for another reason adds its error to the line, so Claude sees an error and not a missing CLI.
 */
export const sessionStart = async (
  payload: HookPayload | undefined,
  env: NodeJS.ProcessEnv,
) => {
  const root = rootOf(payload, env);
  if (!indexed(root)) return undefined;
  const { ran } = await syncOnce(root, env, START_SYNC_TIMEOUT_MS);
  if (ran?.error?.code === "ENOENT") return undefined;
  const failure =
    ran && !ran.ok
      ? ` ${SESSION_SYNC_FAILED({ detail: failureDetail(ran.exitCode, ran.stderr) })}`
      : "";
  return context("SessionStart", SESSION_LINE + failure);
};

/** Syncs the index, one sync at a time, within `budgetMs`. The hook is async, so the wait does not delay the session. */
export const sync = async (
  payload: HookPayload | undefined,
  env: NodeJS.ProcessEnv,
  budgetMs = BACKGROUND_SYNC_TIMEOUT_MS,
): Promise<void> => {
  const root = rootOf(payload, env);
  if (indexed(root)) await syncOnce(root, env, budgetMs);
};

if (import.meta.main) {
  const mode = process.argv[2] ?? "";
  try {
    const payload = parseJson(await Bun.stdin.text());
    if (payload !== null) {
      if (mode === "sync") await sync(payload, process.env);
      else if (mode === "sync-git")
        await sync(payload, process.env, GIT_SYNC_TIMEOUT_MS);
      else if (mode === "session-start") {
        const out = await sessionStart(payload, process.env);
        if (out) process.stdout.write(JSON.stringify(out));
      }
    }
  } catch (err) {
    process.stderr.write(
      `claudetto-codegraph hook failed: ${(err as { stack?: string } | undefined)?.stack ?? err}\n`,
    );
  }
}
