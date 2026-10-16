// The hook `WorktreeCreate`: a worktree from `HEAD`, the copy of `.worktreeinclude`, and the failures.

import { afterEach, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { drop, home, hook, makeRepo, sh } from "./repo.ts";

const made: string[] = [];
const repo = async () => {
  const root = await makeRepo();
  made.push(root);
  return root;
};
afterEach(() => {
  for (const dir of made.splice(0)) drop(dir);
});

test("a worktree starts from `HEAD` with the files of `.worktreeinclude`", async () => {
  const root = await repo();
  await Bun.write(path.join(root, "b.txt"), "b\n");
  sh(root, "add", "b.txt");
  sh(root, "commit", "-q", "-m", "local commit");
  const r = hook("create", { name: "agent-1", cwd: root });
  const dest = path.join(root, ".claude", "worktrees", "agent-1");
  expect(r.status).toBe(0);
  expect(sh(dest, "rev-parse", "HEAD")).toBe(sh(root, "rev-parse", "HEAD"));
  expect(await Bun.file(path.join(dest, "b.txt")).text()).toBe("b\n");
  expect(await Bun.file(path.join(dest, ".env")).text()).toBe("SECRET=1\n");
  expect(fs.existsSync(path.join(dest, "cache"))).toBe(false);
  expect(sh(dest, "symbolic-ref", "--short", "HEAD")).toBe("worktree-agent-1");
});

test("a pattern with a folder copies the ignored files below it", async () => {
  const root = await repo();
  fs.mkdirSync(path.join(root, "plugins", "p", "types"), { recursive: true });
  await Bun.write(
    path.join(root, "plugins", "p", "types", ".gitignore"),
    "*\n",
  );
  await Bun.write(path.join(root, "plugins", "p", "types", "t.d.ts"), "t\n");
  fs.appendFileSync(path.join(root, ".worktreeinclude"), "plugins/*/types/\n");
  sh(root, "add", "-A");
  sh(root, "commit", "-q", "-m", "types");
  const r = hook("create", { name: "agent-2", cwd: root });
  const dest = path.join(root, ".claude", "worktrees", "agent-2");
  expect(r.status).toBe(0);
  expect(
    fs.existsSync(path.join(dest, "plugins", "p", "types", "t.d.ts")),
  ).toBe(true);
});

test("a file that `.worktreeinclude` names and git does not ignore is not copied", async () => {
  const root = await repo();
  await Bun.write(path.join(root, "loose.txt"), "l\n");
  fs.appendFileSync(path.join(root, ".worktreeinclude"), "loose.txt\n");
  const r = hook("create", { name: "agent-3", cwd: root });
  expect(r.status).toBe(0);
  expect(
    fs.existsSync(
      path.join(root, ".claude", "worktrees", "agent-3", "loose.txt"),
    ),
  ).toBe(false);
});

test("a repository with no `.worktreeinclude` gets a worktree with no copy", async () => {
  const root = await repo();
  fs.rmSync(path.join(root, ".worktreeinclude"));
  const r = hook("create", { name: "agent-4", cwd: root });
  expect(r.status).toBe(0);
  expect(
    fs.existsSync(path.join(root, ".claude", "worktrees", "agent-4", ".env")),
  ).toBe(false);
});

test("the hook prints the path of the new worktree", async () => {
  const root = await repo();
  const r = hook("create", { name: "agent-5", cwd: root });
  expect(r.out).toBe(path.join(root, ".claude", "worktrees", "agent-5"));
});

test("a call from inside a worktree makes the new worktree in the main repository", async () => {
  const root = await repo();
  const first = hook("create", { name: "outer", cwd: root }).out;
  const r = hook("create", { name: "inner", cwd: first });
  expect(r.out).toBe(path.join(root, ".claude", "worktrees", "inner"));
});

test("a name with a path part fails with a reason and makes no worktree", async () => {
  const root = await repo();
  const r = hook("create", { name: "../evil", cwd: root });
  expect(r.status).toBe(1);
  expect(r.err).toContain("not valid");
  expect(sh(root, "worktree", "list").split("\n")).toHaveLength(1);
});

test("a folder with no repository fails with a reason", async () => {
  const r = hook("create", { name: "agent-6", cwd: "/" });
  expect(r.status).toBe(1);
  expect(r.err).toContain("not in a git repository");
});

test("an input that is not JSON fails with a reason", async () => {
  const r = hook("create", "not json");
  expect(r.status).toBe(1);
  expect(r.err).toContain("not a JSON object");
});

test("the hook records the new worktree for the sweep of `gc`", async () => {
  const root = await repo();
  const dest = hook("create", {
    name: "rec-1",
    cwd: root,
    session_id: "sess-rec",
  }).out;
  const file = path.join(home, ".claudetto", "gc", "sess-rec.json");
  const records = JSON.parse(await Bun.file(file).text());
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({
    path: dest,
    kind: "worktree",
    session: "sess-rec",
    cwd: root,
  });
});
