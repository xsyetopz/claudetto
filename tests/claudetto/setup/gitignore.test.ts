// The `.gitignore` step of `claudetto-setup --apply`: it lists the local files that claudetto writes into a project with `.git/`.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";

/** Runs `claudetto-setup --apply` in a new project, with `.git/` when `git` is true and `ignore` as the old `.gitignore`. */
const run = async (git: boolean, ignore?: string, times = 1) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "gitignore-"));
  const project = path.join(dir, "project");
  await mkdir(project);
  if (git) await mkdir(path.join(project, ".git"));
  const file = path.join(project, ".gitignore");
  if (ignore !== undefined) await Bun.write(file, ignore);
  const io = { log: () => {}, error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: project };
  for (let i = 0; i < times; i++)
    expect(await main(["--apply"], env, project, io)).toBe(0);
  return (await Bun.file(file).exists()) ? await Bun.file(file).text() : null;
};

test("in a project with `.git/`, setup lists the state, cache, and scratch files of claudetto", async () => {
  const text = (await run(true)) ?? "";
  const lines = text.split("\n");
  expect(lines).toContain("/.claudetto/");
  expect(lines).toContain("/.jscpd.json");
  expect(lines).toContain("/.claude/settings.local.json");
});

test("setup keeps the files that a team shares and the files of other plugins out of the list", async () => {
  const text = (await run(true)) ?? "";
  for (const kept of ["jscpd.local.json", "openspec", "HANDOVER.md"])
    expect(text).not.toContain(kept);
  expect(text.split("\n")).not.toContain("/.claude/");
  expect(text.split("\n")).not.toContain("/.claude/settings.json");
});

test("setup keeps the lines and the order of the user, and a second run adds no duplicate", async () => {
  const old = "dist/\n/.claudetto/\nnode_modules/";
  const once = (await run(true, old)) ?? "";
  expect(once.startsWith(`${old}\n`)).toBe(true);
  expect(once.match(/^\/\.claudetto\/$/gm)).toHaveLength(1);
  expect(await run(true, old, 2)).toBe(once);
});

test("in a project with no `.git/`, setup writes no `.gitignore` and keeps an old one as it is", async () => {
  expect(await run(false)).toBeNull();
  expect(await run(false, "dist/\n")).toBe("dist/\n");
});
