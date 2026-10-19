// The mod handler of the `patch` slice: `tool.call` on `Edit` and `Write` of a subagent in a linked worktree (design D64).
// After the edit, the hook writes one cumulative patch in the main checkout: the diff of the base commit against the working tree, with the untracked files.
// A temporary index holds the untracked files, so the index of the worktree stays as it is.
// The main thread and a checkout that is not a linked worktree write nothing.
//
// The hook calls `next` first and has no catch-all (D49): the result of the edit stands when the hook throws after it.
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here.

import type { EngineInterface, MatchedHook } from "claude-code";
import {
  BASE_FILE,
  PATCH_FILE,
  PATCHES_DIR,
} from "../../../../../kernel/paths.ts";
import { GIT_TIMEOUT_MS } from "../limits.ts";

/** The `tool.call` hook with the `Edit` and `Write` filter. */
type FileHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Edit", "Write"] }
>;

/** Runs `git` in `cwd`, with `env` over the environment of the session. */
const git = (
  $: EngineInterface,
  cwd: string,
  args: string[],
  env?: Record<string, string>,
) =>
  $.process.run(["git", ...args], {
    cwd,
    timeoutMs: GIT_TIMEOUT_MS,
    ...(env ? { env } : {}),
  });

/** Writes the patch of the agent `agentId` for the worktree that holds `file`. */
const writePatch = async (
  $: EngineInterface,
  agentId: string,
  file: string,
) => {
  const cwd = file.slice(0, file.lastIndexOf("/"));
  const probe = await git($, cwd, [
    "rev-parse",
    "--path-format=absolute",
    "--show-toplevel",
    "--git-dir",
    "--git-common-dir",
    "HEAD",
  ]);
  const [top, gitDir, common, head] = probe.stdout.trim().split("\n");
  // In the main checkout the git dir is the common dir, and only a linked worktree can lose its work with its removal.
  if (probe.exitCode !== 0 || !top || !common || !head || gitDir === common)
    return;
  const folder = `${common.replace(/\/\.git$/, "")}/${PATCHES_DIR}/${agentId}`;
  const baseFile = `${folder}/${BASE_FILE}`;
  // The base is the commit of the first write, so a commit of the agent stays in the patch.
  const known = await $.fs.exists(baseFile);
  const base = known ? (await $.fs.read(baseFile)).trim() : head;
  if (!known) await $.fs.write(baseFile, base);
  const env = { GIT_INDEX_FILE: `${gitDir}/claudetto.index` };
  await git($, top, ["add", "-A"], env);
  await git(
    $,
    top,
    ["diff", "--cached", "--binary", `--output=${folder}/${PATCH_FILE}`, base],
    env,
  );
};

export const onFileWrite: FileHook = async ($, e, next) => {
  const out = await next(e);
  if (e.agentId !== undefined) await writePatch($, e.agentId, e.file_path);
  return out;
};
