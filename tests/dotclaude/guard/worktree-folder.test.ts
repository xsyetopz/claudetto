// Tests of the branch switch in a subagent, from a subfolder of a linked worktree, of the main checkout, and of a folder with no repository.
// The main checkout is the first `.git` above the folder, and a `.git` file means a linked worktree, so a subfolder reads its checkout from above.
// No command runs, and each deny holds the exact command.

import { expect, test } from "bun:test";
import { bare, linked, main, mainDeny, subagentDeny } from "./ports.ts";

/** The deny of a branch switch in a subagent in `cwd`, which must hold the exact command. */
const denied = async (command: string, cwd: string) => {
  const reason = await subagentDeny(command, cwd);
  expect(reason, command).not.toBeNull();
  expect(reason, command).toContain(command);
};

/** The branch switch in a subagent in `cwd` stays allowed: no deny text is given. */
const allowed = async (command: string, cwd: string) => {
  expect(await subagentDeny(command, cwd), command).toBeNull();
};

test("a subfolder of a linked worktree is not the main checkout, so its branch switch is allowed", async () => {
  await allowed("git checkout -b x", `${linked}/src`);
});

test("a subfolder of the main checkout is the main checkout, so its branch switch is denied", async () => {
  await denied("git checkout -b x", `${main}/src`);
});

test("a folder with no .git above it is not a repository, so its branch switch is allowed", async () => {
  await allowed("git checkout -b x", bare);
});

test("git -C reads the checkout of its folder under the session folder", async () => {
  await denied("git -C src checkout -b x", main);
  await allowed("git -C src checkout -b x", linked);
});

test("the main session keeps a branch switch from any folder", async () => {
  expect(await mainDeny("git checkout -b x", `${main}/src`)).toBeNull();
});
