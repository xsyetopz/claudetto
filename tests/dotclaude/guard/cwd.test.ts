// Tests of the folder that a git command reads its paths and its checkout from: `git -C <dir>` and a leading `cd <dir> &&` (spec P37, step 3).
// A path that is a folder under `<dir>` is denied, and the same path under the working directory stays allowed.
// A branch switch reads the `.git` of `<dir>`, so the main checkout and a linked worktree differ by `<dir>` and not by the working directory.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "../../support/repo.ts";
import { bare, linked, main, mainDeny, subagentDeny } from "./ports.ts";

/** A folder with a folder `only-root` and a file `file.txt`, and a subfolder `sub` with a folder `inner`. */
const root = tmpDir("dc-guard-cwd-root");
fs.mkdirSync(path.join(root, "only-root"), { recursive: true });
await Bun.write(path.join(root, "file.txt"), "x\n");
fs.mkdirSync(path.join(root, "sub", "inner"), { recursive: true });

/** The deny of `command` in the main session, which must hold the exact command. */
const denied = async (command: string, cwd: string) => {
  const reason = await mainDeny(command, cwd);
  expect(reason, command).not.toBeNull();
  expect(reason, command).toContain(command);
};

/** The allowed commands of `git checkout` in the main session: no deny text is given. */
const allowed = async (command: string, cwd: string) => {
  expect(await mainDeny(command, cwd), command).toBeNull();
};

test("git -C reads the folder of its path under <dir>, not under the working directory", async () => {
  await denied(`git -C ${root} checkout HEAD -- only-root`, bare);
  await allowed("git checkout HEAD -- only-root", bare);
});

test("git -C reads a file of <dir> as a file, so a checkout of it stays allowed", async () => {
  await allowed(`git -C ${root} checkout HEAD -- file.txt`, bare);
});

test("a relative git -C joins its folder with the working directory", async () => {
  await denied("git -C sub checkout HEAD -- inner", root);
  await allowed("git -C sub checkout HEAD -- only-root", root);
});

test("a leading cd sets the folder of the path of the git command after it", async () => {
  await denied(`cd ${root} && git checkout HEAD -- only-root`, bare);
  await allowed("cd sub && git checkout HEAD -- only-root", root);
  await denied("cd sub && git checkout HEAD -- inner", root);
});

test("a relative cd joins its folder with the working directory", async () => {
  await denied("cd sub && git restore --source=HEAD inner", root);
  await allowed("cd sub && git restore --source=HEAD only-root", root);
});

test("a subagent's branch switch reads the checkout of git -C, not of the working directory", async () => {
  expect(await subagentDeny(`git -C ${main} checkout -b x`, linked)).toContain(
    `git -C ${main} checkout -b x`,
  );
  expect(await subagentDeny(`git -C ${linked} checkout -b x`, main)).toBeNull();
  expect(await subagentDeny(`git -C ${linked} switch main`, main)).toBeNull();
});

test("a subagent's branch switch reads the checkout of a leading cd, not of the working directory", async () => {
  const deny = await subagentDeny(`cd ${main} && git switch main`, linked);
  expect(deny).toContain(`cd ${main} && git switch main`);
  expect(
    await subagentDeny(`cd ${linked} && git checkout -b x`, main),
  ).toBeNull();
});
