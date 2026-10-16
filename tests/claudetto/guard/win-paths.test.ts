// Tests of the branch switch with Windows paths, such as `D:\w\main`, on any OS.
// The fake file system reads `\` and `/` as one separator, and it ignores the case, as Windows does.
// A path with a drive letter is absolute, and the walk up to the first `.git` crosses each `\`.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../plugins/claudetto/slices/guard/adapters/mod.ts";
import { bash, passes } from "./ports.ts";

/** The entries of the fake checkouts: a `.git` folder is the main checkout, and a `.git` file is a linked worktree. */
const TREE: Record<string, "dir" | "file"> = {
  "d:/w/main/.git": "dir",
  "d:/w/main/src/a.ts": "file",
  "d:/w/linked/.git": "file",
  "d:/w/linked/src/a.ts": "file",
  "d:/w/bare/a.ts": "file",
};

/** A stub engine in the folder `cwd`, with each `stat` call recorded in `stats`. */
const engineIn = (cwd: string, stats: string[]): EngineInterface =>
  ({
    session: { cwd: async () => cwd },
    fs: {
      stat: async (file: string) => {
        stats.push(file);
        const kind = TREE[file.replace(/\\/g, "/").toLowerCase()];
        if (kind === undefined)
          throw Object.assign(new Error(`ENOENT: ${file}`), { code: "ENOENT" });
        return { kind, size: 1, mtimeMs: 0, isLink: false };
      },
    },
  }) as unknown as EngineInterface;

/** The deny text of `command` from a subagent in `cwd`, or `null` when it stays allowed, and the `stat` calls. */
const subagentIn = async (command: string, cwd: string) => {
  const stats: string[] = [];
  const out = await onBashCall(
    engineIn(cwd, stats),
    bash(command, "a1"),
    passes,
  );
  return { deny: "deny" in out ? (out.deny ?? null) : null, stats };
};

test("a `git -C` with a drive path reads that main checkout, so a branch switch from a linked worktree is denied", async () => {
  const command = "git -C 'D:\\w\\main' checkout -b x";
  const { deny } = await subagentIn(command, "D:\\w\\linked");
  expect(deny).toContain(command);
});

test("a leading `cd` with a drive path reads that main checkout, so a branch switch from a linked worktree is denied", async () => {
  const command = "cd 'D:\\w\\main' && git switch main";
  const { deny } = await subagentIn(command, "D:\\w\\linked");
  expect(deny).toContain(command);
});

test("a relative `git -C` after a drive-path `cd` joins under that drive path", async () => {
  const command = "cd 'D:\\w' && git -C main checkout -b x";
  const { deny } = await subagentIn(command, "D:\\w\\linked");
  expect(deny).toContain(command);
});

test("a `git -C` with the drive path of a linked worktree is allowed from the main checkout", async () => {
  const { deny } = await subagentIn(
    "git -C 'D:\\w\\linked' checkout -b x",
    "D:\\w\\main",
  );
  expect(deny).toBeNull();
});

test("a branch switch from a subfolder of the main checkout walks up over each `\\` and is denied", async () => {
  const { deny } = await subagentIn("git checkout -b x", "D:\\w\\main\\src");
  expect(deny).toContain("git checkout -b x");
});

test("a branch switch from a subfolder of a linked worktree is allowed", async () => {
  const { deny } = await subagentIn("git checkout -b x", "D:\\w\\linked\\src");
  expect(deny).toBeNull();
});

test("a folder with no `.git` above it is allowed, and the walk stops at the drive root", async () => {
  const { deny, stats } = await subagentIn("git checkout -b x", "D:\\w\\bare");
  expect(deny).toBeNull();
  expect(stats.length).toBeLessThanOrEqual(4);
});
