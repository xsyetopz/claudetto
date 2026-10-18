// `changesTree`: the `git` commands that change the tree, read with the shell parser of the kernel.

import { expect, test } from "bun:test";
import { changesTree } from "../../plugins/claudetto-codegraph/slices/graph/graph.ts";

test("each git command that changes the tree matches", () => {
  for (const sub of [
    "commit -m x",
    "merge main",
    "rebase main",
    "pull --ff-only",
    "checkout main",
    "switch main",
    "reset --hard HEAD~1",
    "cherry-pick abc",
    "revert abc",
    "stash",
    "stash pop",
    "stash push -m x",
    "apply a.patch",
    "am a.mbox",
    "restore .",
    "clean -fd",
    "rm a.ts",
    "mv a.ts b.ts",
    "submodule update --init",
    "sparse-checkout set src",
    "bisect good",
  ])
    expect(changesTree(`git ${sub}`), sub).toBe(true);
});

test("a git command with global options before its verb matches", () => {
  for (const command of [
    "git -C dir commit -m x",
    "git -c user.name=x pull --ff-only",
    "git --git-dir=/p/.git --work-tree=/p commit -m x",
    "git --git-dir /p/.git commit -m x",
    "git --no-pager -C 'my dir' merge main",
    'git -c user.name="A B" rebase main',
    "git --attr-source HEAD commit -m x",
    "git --config-env foo=BAR restore .",
  ])
    expect(changesTree(command), command).toBe(true);
});

test("a wrapped, nested, or later git command matches", () => {
  for (const command of [
    "env GIT_DIR=.git git checkout main",
    "timeout 5 git reset --hard",
    "(cd sub && git pull)",
    "bun test\ngit commit -m x",
    "cd x && git commit -m y",
    "sudo git merge main",
    "sh -c 'git rebase main'",
  ])
    expect(changesTree(command), command).toBe(true);
});

test("a git command that changes no file, and another command, does not match", () => {
  for (const command of [
    "git status",
    "git diff HEAD",
    "git log --oneline",
    "git -C dir log --oneline",
    "git show HEAD",
    "git branch",
    "git push",
    "git stash list",
    "git stash show -p",
    "echo git commit",
    "ls",
    "",
  ])
    expect(changesTree(command), command).toBe(false);
});

test("a 50 KB command with repeated `--git-dir` options ends within a time bound", () => {
  const command = `git ${"--git-dir ".repeat(5000)}status`;
  const started = Date.now();
  expect(changesTree(command)).toBe(false);
  expect(Date.now() - started).toBeLessThan(500);
});
