// A `merge` that stops after the git merge or at the commit leaves a state that a retry finishes.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  CHANGES,
  commitFile,
  eventsOf,
  exists,
  file,
  frontKey,
  git,
  packageIn,
  phase,
  pkgFile,
  plannedChange,
  write,
} from "./run-phase.ts";

const status = (root: string): Promise<string> =>
  frontKey(root, pkgFile("c1"), "status");

/** `P1` approved on the branch `feat`. `main` has a `justfile` whose `generate` fails until the file `ok` exists. */
const withGenerate = async (): Promise<string> => {
  const root = await plannedChange("c1", "test -f feature.txt");
  git(root, "checkout", "-q", "-b", "feat");
  commitFile(root, "feature.txt");
  await phase(root, "implement", "P1");
  await phase(root, "verify", "P1");
  await phase(root, "review", "P1", "approve");
  git(root, "checkout", "-q", "main");
  await write(root, "plugins/g.txt", "old\n");
  await write(
    root,
    "justfile",
    "generate:\n\techo new > plugins/g.txt\n\ttest -f ok\n",
  );
  git(root, "add", "plugins", "justfile");
  git(root, "commit", "-q", "-m", "generate");
  return root;
};

describe("merge after a failed just generate", () => {
  test("a retry skips the git merge, commits the generated files, and ends done", async () => {
    const root = await withGenerate();
    expect((await phase(root, "merge", "P1", "feat")).code).toBe(1);
    expect(exists(root, "feature.txt")).toBe(true);
    expect(await status(root)).toBe("approved");
    await write(root, "ok", "");
    await write(root, "scratch.txt", "mine\n");
    const before = git(root, "rev-list", "--count", "HEAD");
    const r = await phase(root, "merge", "P1", "feat");
    expect(r.err).toEqual([]);
    expect(r.code).toBe(0);
    expect(await status(root)).toBe("done");
    expect((await eventsOf(root, "c1")).at(-1)?.["state"]).toBe("done");
    expect(git(root, "rev-list", "--count", "HEAD")).toBe(
      String(Number(before) + 1),
    );
    const committed = git(root, "show", "--name-only", "--format=", "HEAD");
    expect(committed).toContain("plugins/g.txt");
    expect(committed).toContain(`${CHANGES}/c1/events.jsonl`);
    expect(git(root, "ls-files", "scratch.txt")).toBe("");
    expect(git(root, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });

  test("a retry refuses a change outside plugins and the change folder", async () => {
    const root = await withGenerate();
    await phase(root, "merge", "P1", "feat");
    await write(root, "ok", "");
    await write(root, "feature.txt", "edited\n");
    const r = await phase(root, "merge", "P1", "feat");
    expect(r.code).toBe(1);
    expect(await status(root)).toBe("approved");
    expect(await file(root, "feature.txt")).toBe("edited\n");
  });
});

describe("merge and a failed commit", () => {
  const hook = async (root: string, code: number): Promise<void> => {
    const hooks = path.join(root, ".git", "hooks");
    fs.mkdirSync(hooks, { recursive: true });
    const target = path.join(hooks, "pre-commit");
    await Bun.write(target, `#!/bin/sh\nexit ${code}\n`);
    fs.chmodSync(target, 0o755);
  };

  test("leaves the package approved and the log as before, and a retry ends done", async () => {
    const root = await packageIn("approved");
    const log = await file(root, `${CHANGES}/c1/events.jsonl`);
    const head = git(root, "rev-parse", "HEAD");
    await hook(root, 1);
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await status(root)).toBe("approved");
    expect(await file(root, `${CHANGES}/c1/events.jsonl`)).toBe(log);
    expect(git(root, "rev-parse", "HEAD")).toBe(head);
    await hook(root, 0);
    const r = await phase(root, "merge", "P1");
    expect(r.code).toBe(0);
    expect(await status(root)).toBe("done");
    expect(git(root, "status", "--porcelain", "--untracked-files=no")).toBe("");
  });
});
