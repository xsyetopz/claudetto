// `merge`: the merge of a branch, the generator, the commit of `plugins/`, the lane, and the stop on a conflict.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { GIT_REPO_TEST_TIMEOUT_MS } from "../../../../tools/limits.ts";
import { has, read, run } from "./helpers.ts";
import { CHANGE } from "./plan.ts";

import { branch, git, lanesOf, makeRepo } from "./repo.ts";

test(
  "merge merges the branch, runs the generator, commits plugins, and sets the lane done",
  async () => {
    const root = await makeRepo();
    await branch(root, "p01", "src.txt", "changed\n");
    const r = await run(root, "merge", "P01", "p01");
    expect(r.code).toBe(0);
    expect(await read(root, "src.txt")).toBe("changed\n");
    expect(await read(root, "plugins/out.txt")).toBe("changed\n");
    expect(git(root, "status", "--porcelain", "--", "plugins")).toBe("");
    expect(git(root, "status", "--porcelain")).toBe("");
    expect(
      git(root, "log", "-1", "--name-only", "--format=").split("\n").sort(),
    ).toStrictEqual([
      `${CHANGE}/events.jsonl`,
      `${CHANGE}/packages.md`,
      "plugins/out.txt",
    ]);
    expect((await lanesOf(root))["P01"]).toBe("done");
    expect(await read(root, `${CHANGE}/packages.md`)).toContain("- [x] P01");
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);

test(
  "merge commits the lane files in the last commit when the generator changes nothing",
  async () => {
    const root = await makeRepo();
    await branch(root, "p01", "other.txt", "x\n");
    expect((await run(root, "merge", "P01", "p01")).code).toBe(0);
    expect(
      git(root, "log", "-1", "--name-only", "--format=").split("\n").sort(),
    ).toStrictEqual([`${CHANGE}/events.jsonl`, `${CHANGE}/packages.md`]);
    expect(git(root, "status", "--porcelain")).toBe("");
    expect((await lanesOf(root))["P01"]).toBe("done");
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);

test(
  "merge stops on a conflict, sets no lane, and prints the conflicted files",
  async () => {
    const root = await makeRepo();
    await branch(root, "p01", "shared.txt", "branch\n");
    await Bun.write(path.join(root, "shared.txt"), "main\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "main change");
    const events = await read(root, `${CHANGE}/events.jsonl`);
    const r = await run(root, "merge", "P01", "p01");
    expect(r.code).toBe(1);
    expect(r.err).toContain("shared.txt");
    expect(has(root, ".git/MERGE_HEAD")).toBe(true);
    expect(await read(root, `${CHANGE}/events.jsonl`)).toBe(events);
    expect((await lanesOf(root))["P01"]).toBe("review");
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);

test(
  "merge stops on a missing argument, an unknown package, and a branch that does not exist",
  async () => {
    const root = await makeRepo();
    expect((await run(root, "merge", "P01")).code).toBe(2);
    expect((await run(root, "merge", "P09", "main")).code).toBe(1);
    expect((await run(root, "merge", "P01", "nope")).code).toBe(1);
    expect((await lanesOf(root))["P01"]).toBe("review");
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);

test(
  "merge is refused in a linked worktree, and the branch is not merged",
  async () => {
    const root = await makeRepo();
    await branch(root, "p01", "src.txt", "changed\n");
    const linked = `${root}-linked`;
    git(root, "worktree", "add", "-q", "-b", "side", linked);
    try {
      expect((await run(linked, "merge", "P01", "p01")).code).toBe(1);
      expect(await read(linked, "src.txt")).toBe("base\n");
    } finally {
      fs.rmSync(linked, { recursive: true, force: true });
    }
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);

test(
  "merge run again after a committed resolution of the conflict sets the lane done",
  async () => {
    const root = await makeRepo();
    await branch(root, "p01", "shared.txt", "branch\n");
    await Bun.write(path.join(root, "shared.txt"), "main\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "main change");
    expect((await run(root, "merge", "P01", "p01")).code).toBe(1);
    await Bun.write(path.join(root, "shared.txt"), "resolved\n");
    git(root, "add", "shared.txt");
    git(root, "commit", "-q", "--no-edit");
    expect(has(root, ".git/MERGE_HEAD")).toBe(false);
    expect((await run(root, "merge", "P01", "p01")).code).toBe(0);
    expect((await lanesOf(root))["P01"]).toBe("done");
    expect(git(root, "status", "--porcelain")).toBe("");
  },
  GIT_REPO_TEST_TIMEOUT_MS,
);
