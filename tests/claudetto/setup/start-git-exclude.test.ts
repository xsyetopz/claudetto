// The git excludes at `session.start`: `onSessionStart` of `adapters/mod.ts` adds the runtime paths to `.git/info/exclude`.
// The `$` here is a fake that runs `git` and the file calls in a temp repository.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { EngineInterface } from "claude-code";
import { onSessionStart } from "../../../plugins/claudetto/slices/setup/adapters/mod.ts";
import { tmpDir } from "../../support/repo.ts";

/** A git repository whose folder name has non-ASCII letters, with the ignore file of the user hidden. */
const repo = (): string => {
  const dir = path.join(tmpDir("start-exclude"), "répo año");
  fs.mkdirSync(dir);
  for (const args of [
    ["init", "-q", dir],
    ["-C", dir, "config", "core.excludesFile", "/dev/null"],
  ])
    expect(Bun.spawnSync(["git", ...args]).exitCode).toBe(0);
  return dir;
};

/** A fake `$` that works in `cwd`, like the host does for the working folder of the session. */
const fake = (cwd: string, failRun = false): EngineInterface =>
  ({
    plugin: { root: "/plugins/claudetto" },
    process: {
      run: async (argv: string[]) => {
        if (failRun) throw new Error("no git");
        const r = Bun.spawnSync(argv, { cwd });
        return { exitCode: r.exitCode, stdout: r.stdout.toString() };
      },
    },
    fs: {
      exists: async (f: string) => fs.existsSync(path.resolve(cwd, f)),
      read: (f: string) => Bun.file(path.resolve(cwd, f)).text(),
      write: async (f: string, text: string) => {
        await Bun.write(path.resolve(cwd, f), text);
      },
    },
    settings: { read: async () => ({}) },
    session: { turns: async () => 1, usage: async () => ({}) },
    env: { get: async () => undefined },
  }) as unknown as EngineInterface;

const start = (cwd: string, failRun = false) =>
  onSessionStart(
    fake(cwd, failRun),
    { cwd } as never,
    (async (e: unknown) => e) as never,
  );

const untracked = (cwd: string): string =>
  Bun.spawnSync(["git", "status", "--porcelain", "-uall", "-z"], {
    cwd,
  }).stdout.toString();

test("a session start excludes the worktree folder, also under a non-ASCII path, and a second start changes nothing", async () => {
  const cwd = repo();
  const made = path.join(cwd, ".claude", "worktrees", "agent-ñ");
  fs.mkdirSync(made, { recursive: true });
  await Bun.write(path.join(made, "f.txt"), "x");
  expect(untracked(cwd)).toContain("worktrees");
  await start(cwd);
  expect(untracked(cwd)).not.toContain("worktrees");
  const file = path.join(cwd, ".git", "info", "exclude");
  const once = await Bun.file(file).text();
  await start(cwd);
  expect(await Bun.file(file).text()).toBe(once);
});

test("a session start outside a git repository, or with a git call that fails, still passes the event on", async () => {
  const plain = tmpDir("start-plain");
  expect(await start(plain)).toEqual({ cwd: plain });
  expect(await start(repo(), true)).toBeDefined();
});
