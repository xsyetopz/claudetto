// The hook `WorktreeRemove`: remove a worktree only when `git status --ignored` shows no file that a session made.

import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { drop, hook, makeRepo, sh } from "./repo.ts";

const made: string[] = [];
const fresh = async (name = "agent-1") => {
  const root = await makeRepo();
  made.push(root);
  const dest = hook("create", { name, cwd: root }).out;
  return { root, dest };
};
afterEach(() => {
  for (const dir of made.splice(0)) drop(dir);
});

test("a worktree with only copied files is removed", async () => {
  const { root, dest } = await fresh();
  expect(fs.existsSync(path.join(dest, ".env"))).toBe(true);
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(0);
  expect(fs.existsSync(dest)).toBe(false);
  expect(sh(root, "branch", "--list", "worktree-agent-1")).toBe("");
});

test("a worktree with a file of a session stays and the reason names the file", async () => {
  const { root, dest } = await fresh();
  await Bun.write(path.join(dest, "notes.txt"), "n\n");
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(1);
  expect(r.err).toContain("notes.txt");
  expect(fs.existsSync(path.join(dest, "notes.txt"))).toBe(true);
});

test("an ignored file that a session made keeps the worktree", async () => {
  const { root, dest } = await fresh();
  fs.mkdirSync(path.join(dest, "cache"));
  await Bun.write(path.join(dest, "cache", "made.txt"), "m\n");
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(1);
  expect(r.err).toContain("cache/made.txt");
  expect(fs.existsSync(dest)).toBe(true);
});

test("a change to a tracked file keeps the worktree", async () => {
  const { root, dest } = await fresh();
  fs.appendFileSync(path.join(dest, "a.txt"), "more\n");
  expect(hook("remove", { worktree_path: dest, cwd: root }).status).toBe(1);
  expect(fs.existsSync(dest)).toBe(true);
});

test("a commit in the worktree removes the folder and keeps the branch", async () => {
  const { root, dest } = await fresh();
  await Bun.write(path.join(dest, "c.txt"), "c\n");
  sh(dest, "add", "c.txt");
  sh(dest, "commit", "-q", "-m", "work");
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(0);
  expect(fs.existsSync(dest)).toBe(false);
  expect(sh(root, "branch", "--list", "worktree-agent-1")).toContain(
    "worktree-agent-1",
  );
});

test("a worktree that is already gone gives exit 0", async () => {
  const { root, dest } = await fresh();
  hook("remove", { worktree_path: dest, cwd: root });
  expect(hook("remove", { worktree_path: dest, cwd: root }).status).toBe(0);
});

test("an untracked `.worktreeinclude` of the main checkout still marks the copies", async () => {
  const root = await makeRepo();
  made.push(root);
  sh(root, "rm", "-q", "--cached", ".worktreeinclude");
  fs.appendFileSync(path.join(root, ".gitignore"), ".worktreeinclude\n");
  sh(root, "add", "-A");
  sh(root, "commit", "-q", "-m", "untrack");
  const dest = hook("create", { name: "agent-u", cwd: root }).out;
  expect(fs.existsSync(path.join(dest, ".env"))).toBe(true);
  expect(hook("remove", { worktree_path: dest, cwd: root }).status).toBe(0);
  expect(fs.existsSync(dest)).toBe(false);
});

test("an ignored file that matches `.worktreeinclude` but a session made keeps the worktree", async () => {
  const { root, dest } = await fresh();
  fs.appendFileSync(path.join(root, ".gitignore"), ".env*\n");
  fs.appendFileSync(path.join(root, ".worktreeinclude"), ".env*\n");
  await Bun.write(path.join(dest, ".env.session"), "S=1\n");
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(1);
  expect(r.err).toContain(".env.session");
  expect(fs.existsSync(path.join(dest, ".env.session"))).toBe(true);
});

test("a copied file that a session edited keeps the worktree", async () => {
  const { root, dest } = await fresh();
  fs.appendFileSync(path.join(dest, ".env"), "NEW=1\n");
  const r = hook("remove", { worktree_path: dest, cwd: root });
  expect(r.status).toBe(1);
  expect(r.err).toContain(".env");
  expect(fs.existsSync(dest)).toBe(true);
});
