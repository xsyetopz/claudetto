// `merge`: the refusals before the merge, the commit of the lane files, and the failure of the generator.

import { expect, test } from "bun:test";
import path from "node:path";
import { has, read, run } from "./helpers.ts";
import { CHANGE } from "./plan.ts";
import { branch, git, lanesOf, makeRepo } from "./repo.ts";

/** The state that a refused `merge` must leave as it was: the commit, the status, and the lanes. */
const snapshot = async (root: string): Promise<string> =>
  JSON.stringify([
    git(root, "rev-parse", "HEAD"),
    git(root, "status", "--porcelain"),
    await lanesOf(root),
  ]);

test("merge refuses a package that is planned or done", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  const before = await snapshot(root);
  for (const pkg of ["P02", "P03"]) {
    expect((await run(root, "merge", pkg, "p01")).code).toBe(1);
  }
  expect(await snapshot(root)).toBe(before);
  expect(await read(root, "src.txt")).toBe("base\n");
});

test("merge refuses a branch that starts with a dash, a missing branch, and the current branch", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  const before = await snapshot(root);
  for (const name of ["--squash", "nope", "main"]) {
    expect((await run(root, "merge", "P01", name)).code).toBe(1);
  }
  expect(await snapshot(root)).toBe(before);
  expect(has(root, ".git/MERGE_HEAD")).toBe(false);
});

test("merge commits the lane files when they are the only changes, and leaves a clean tree", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  expect((await run(root, "lane", "P02", "doing")).code).toBe(0);
  expect(git(root, "status", "--porcelain")).not.toBe("");
  expect((await run(root, "merge", "P01", "p01")).code).toBe(0);
  expect(git(root, "status", "--porcelain")).toBe("");
  const lanes = await lanesOf(root);
  expect(lanes["P01"]).toBe("done");
  expect(lanes["P02"]).toBe("doing");
});

test("merge changes nothing when another file is changed", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  expect((await run(root, "lane", "P02", "doing")).code).toBe(0);
  await Bun.write(path.join(root, "shared.txt"), "dirty\n");
  const before = await snapshot(root);
  expect((await run(root, "merge", "P01", "p01")).code).toBe(1);
  expect(await snapshot(root)).toBe(before);
});

test("merge changes nothing when a file is staged", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  await Bun.write(path.join(root, "new.txt"), "staged\n");
  git(root, "add", "new.txt");
  const before = await snapshot(root);
  expect((await run(root, "merge", "P01", "p01")).code).toBe(1);
  expect(await snapshot(root)).toBe(before);
});

test("merge leaves the lane when the generator fails", async () => {
  const root = await makeRepo("generate:\n    exit 1\n");
  await branch(root, "p01", "src.txt", "changed\n");
  expect((await run(root, "merge", "P01", "p01")).code).toBe(1);
  expect((await lanesOf(root))["P01"]).toBe("review");
  expect(await read(root, `${CHANGE}/packages.md`)).toContain("- [ ] P01");
});
