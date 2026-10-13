// The destructive floor of the `guard` slice, denied in every session: the main session and a subagent alike (spec P37, step 4).
// Each command is also sent through the wrappers that run another command, and each deny holds the exact command.
// The commands are strings for `onBashCall`, and no command runs.

import { expect, test } from "bun:test";
import { main, mainDeny, subagentDeny } from "../ports.ts";

/** The destructive commands of the floor, in their plain form. */
const FLOOR = [
  "git reset --hard",
  "git clean -fd",
  "git stash drop",
  "git stash clear",
  "git checkout -- .",
  "git checkout HEAD -- src",
  "git restore --source=HEAD src",
  "git checkout -f main",
  "git switch --discard-changes main",
  "git reflog expire --expire=now --all",
  "git gc --prune=now",
  "git filter-branch --index-filter cmd HEAD",
  "git push --force origin main",
  "git push -f origin master",
  "git push -fu origin main",
  "git push origin +main",
  "git push --force-with-lease origin main",
  "git push origin :main",
  "git push origin --delete main",
  "git push -d origin main",
  "git push --mirror",
  "git push --mirror origin",
  "git push --force --all origin",
  "git push --force --tags origin",
  "git push --force --all origin feature",
  "git push --force",
  "git push -f",
  "git push --force-with-lease",
  "git push --force origin",
  "git push -f origin HEAD",
  "git push --force-with-lease origin HEAD",
  "git push origin +HEAD",
  "git branch -D x",
  "git branch -Df x",
  "git branch -fd x",
  "git branch --delete -f x",
  "git rm -rf .",
  "git rm -r -f src",
  "rm -rf /",
  "rm -rf ~",
  "rm -fr $HOME",
  "rm -r -f .git",
  "rm --recursive --force /usr",
  "rm -rf $HOME/..",
  "rm -rf ~user",
  "rm -rf /..",
  "mkfs.ext4 /dev/sda1",
  "diskutil eraseDisk APFS X disk2",
  "dd if=/dev/zero of=/dev/disk2",
  "chmod -R 777 /",
  "chown -R x ~",
  "csrutil disable",
  "spctl --master-disable",
];

/** The same commands with a changed spelling or a changed option, which the words of the command still match. */
const SPELLINGS = [
  'g"i"t reset --hard',
  "git -C . reset --hard",
  "git -c core.x=y reset --hard",
  "find . -maxdepth 0 -exec git reset --hard \\;",
];

/** The forms of one command: the plain text, and the text through each wrapper that runs another command. */
const formsOf = (command: string): string[] => [
  command,
  `env A=1 ${command}`,
  `sudo ${command}`,
  `timeout 5 ${command}`,
  `xargs ${command}`,
  ...(command.includes('"')
    ? []
    : [`bash -c "${command}"`, `eval "${command}"`]),
  ...(command.includes("'") ? [] : [`sh -c '${command}'`]),
];

const ALL = [...FLOOR, ...SPELLINGS];

test("each destructive command is denied in the main session, through each wrapper", async () => {
  for (const base of ALL) {
    for (const command of formsOf(base)) {
      const reason = await mainDeny(command, main);
      expect(reason, command).not.toBeNull();
      expect(reason, command).toContain(command);
    }
  }
});

test("each destructive command is denied in a subagent, through each wrapper", async () => {
  for (const base of ALL) {
    for (const command of formsOf(base)) {
      const reason = await subagentDeny(command, main);
      expect(reason, command).not.toBeNull();
      expect(reason, command).toContain(command);
    }
  }
});

test("a destructive command in a compound command is denied with the whole command in the reason", async () => {
  const command = "ls -la && cd src; git reset --hard || echo failed";
  const reason = await mainDeny(command, main);
  expect(reason).toContain(command);
});

test("a force push of a named feature branch, a push, and a delete of a feature branch are allowed in the main session", async () => {
  for (const command of [
    "git push --force origin feature",
    "git push -f origin feature",
    "git push --force-with-lease origin feature",
    "git push origin +feature",
    "git push origin feature",
    "git push origin :feature",
    "git push origin --delete feature",
    "git push -d origin feature",
  ]) {
    expect(await mainDeny(command, main), command).toBeNull();
  }
});

test("a branch delete without force, and a branch list, are allowed in the main session", async () => {
  for (const command of [
    "git branch -d merged",
    "git branch -a",
    "git branch -f x",
  ]) {
    expect(await mainDeny(command, main), command).toBeNull();
  }
});

/** The commands whose name a substitution wrote, which read as `git`. */
const UNREADABLE = [
  "$(echo git) reset --hard",
  "$(echo git) -C . reset --hard",
  "`echo git` clean -fd",
  "$(echo git) $(echo reset) --hard",
];

test("a command whose name a substitution wrote is denied, through each wrapper with a single-quoted script", async () => {
  for (const base of UNREADABLE) {
    // The shell reader splits a substitution in a double-quoted script, so `bash -c "..."` and `eval "..."` are not tested here.
    for (const command of formsOf(base).filter(
      (f) => !/^(bash -c|eval) "/.test(f),
    )) {
      expect(await mainDeny(command, main), command).not.toBeNull();
      expect(await subagentDeny(command, main), command).not.toBeNull();
    }
  }
});

test("a command whose name is unreadable, with no git verb after it, is allowed", async () => {
  for (const command of [
    "$(which ls) -la",
    "`which ls` -la",
    "$(which ls) src",
  ]) {
    expect(await mainDeny(command, main), command).toBeNull();
  }
});
