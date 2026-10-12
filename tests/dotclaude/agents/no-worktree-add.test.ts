// Tests that no file under `src/` tells an agent to make a git worktree with `git worktree add`.
// dotclaude uses the worktrees of Claude Code (`isolation: worktree`, `EnterWorktree`, and `ExitWorktree`), and it makes none of its own.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO, walk } from "../../support/repo.ts";

const SRC = path.join(REPO, "src");

/** The command that makes a worktree of its own, with any spaces between its words. */
const WORKTREE_ADD = /git\s+worktree\s+add\b/i;

/** The paths of the files under `src/` whose text matches `pattern`, relative to the repository. */
const matchingFiles = async (pattern: RegExp): Promise<string[]> => {
  const hits: string[] = [];
  for (const file of walk(SRC)) {
    if (pattern.test(await Bun.file(file).text())) {
      hits.push(path.relative(REPO, file));
    }
  }
  return hits.sort();
};

test("no file under `src/` tells an agent to run `git worktree add`", async () => {
  expect(await matchingFiles(WORKTREE_ADD)).toEqual([]);
});

test("the pattern matches `git worktree add` in an instruction and in any spacing", () => {
  expect(WORKTREE_ADD.test("use `git worktree add` in the temp folder")).toBe(
    true,
  );
  expect(WORKTREE_ADD.test("run git  worktree   add -b scratch")).toBe(true);
});

test("the pattern does not match `git worktree list`, `remove`, or `EnterWorktree`", () => {
  expect(WORKTREE_ADD.test("run `git worktree list`")).toBe(false);
  expect(WORKTREE_ADD.test("run `git worktree remove <path>`")).toBe(false);
  expect(WORKTREE_ADD.test("call `EnterWorktree` to switch")).toBe(false);
});
