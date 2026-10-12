// `merge`: the merge of a branch, the generator, the commit of `plugins/`, the lane, and the stop on a conflict.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { read, run } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

const git = (cwd: string, ...args: string[]): string => {
  const r = Bun.spawnSync(
    ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
    { cwd },
  );
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  }
  return r.stdout.toString().trim();
};

const JUSTFILE =
  "generate:\n    mkdir -p plugins\n    cp src.txt plugins/out.txt\n";

/** A git repository on `main` with the plan `c1`, a generator, and one commit. */
const makeRepo = async (): Promise<string> => {
  const root = await makePlan([{ id: "P01" }, { id: "P02" }], {
    justfile: JUSTFILE,
    "src.txt": "base\n",
    "shared.txt": "base\n",
    "plugins/out.txt": "base\n",
  });
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  return root;
};

/** A branch `name` with one commit that writes `text` to `file`; the checkout returns to `main`. */
const branch = async (
  root: string,
  name: string,
  file: string,
  text: string,
): Promise<void> => {
  git(root, "checkout", "-q", "-b", name);
  await Bun.write(path.join(root, file), text);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", name);
  git(root, "checkout", "-q", "main");
};

const lanesOf = async (root: string): Promise<Record<string, string>> => {
  const [, ...lines] = (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n");
  return Object.fromEntries(
    lines
      .map((l) => JSON.parse(l) as { package: string; lane: string })
      .map((e) => [e.package, e.lane]),
  );
};

test("merge merges the branch, runs the generator, commits plugins, and sets the lane done", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "src.txt", "changed\n");
  const r = await run(root, "merge", "P01", "p01");
  expect(r.code).toBe(0);
  expect(await read(root, "src.txt")).toBe("changed\n");
  expect(await read(root, "plugins/out.txt")).toBe("changed\n");
  expect(git(root, "status", "--porcelain", "--", "plugins")).toBe("");
  expect(git(root, "log", "-1", "--name-only", "--format=")).toBe(
    "plugins/out.txt",
  );
  expect((await lanesOf(root))["P01"]).toBe("done");
  expect(await read(root, `${CHANGE}/packages.md`)).toContain("- [x] P01");
});

test("merge adds no commit when the generator changes nothing", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "other.txt", "x\n");
  const before = git(root, "rev-list", "--count", "main");
  expect((await run(root, "merge", "P01", "p01")).code).toBe(0);
  // The merge fast-forwards to the commit of the branch, and the generator adds no commit.
  expect(git(root, "rev-list", "--count", "main")).toBe(
    String(Number(before) + 1),
  );
  expect((await lanesOf(root))["P01"]).toBe("done");
});

test("merge stops on a conflict, sets no lane, and prints the conflicted files", async () => {
  const root = await makeRepo();
  await branch(root, "p01", "shared.txt", "branch\n");
  await Bun.write(path.join(root, "shared.txt"), "main\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "main change");
  const events = await read(root, `${CHANGE}/events.jsonl`);
  const r = await run(root, "merge", "P01", "p01");
  expect(r.code).toBe(1);
  expect(r.err).toContain("shared.txt");
  expect(await read(root, `${CHANGE}/events.jsonl`)).toBe(events);
  expect((await lanesOf(root))["P01"]).toBe("planned");
});

test("merge stops on a missing argument, an unknown package, and a branch that does not exist", async () => {
  const root = await makeRepo();
  expect((await run(root, "merge", "P01")).code).toBe(2);
  expect((await run(root, "merge", "P09", "main")).code).toBe(1);
  expect((await run(root, "merge", "P01", "nope")).code).toBe(1);
  expect((await lanesOf(root))["P01"]).toBe("planned");
});

test("merge is refused in a linked worktree, and the branch is not merged", async () => {
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
});
