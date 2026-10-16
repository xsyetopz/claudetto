// The `git` global options with a separate value (spec `command-guard`, "No over-refusal of common forms").
// A global option such as `-C dir` is an option and not a substitution, so the command runs when its verb is safe.
// No command runs. The checks give strings to the guard.

import { expect, test } from "bun:test";
import { main, mainDeny } from "./ports.ts";

test("`git -C dir status` gets no deny", async () => {
  expect(await mainDeny("git -C dir status", main)).toBeNull();
});

test("a global option with a separate value before a safe verb gets no deny", async () => {
  for (const command of [
    "git -c user.name=x status",
    "git --git-dir d status",
    "git --no-pager -C d log",
    "git -C dir checkout -- bun.lock",
  ])
    expect(await mainDeny(command, main), command).toBeNull();
});

test("a global option does not hide a destructive verb", async () => {
  for (const command of [
    "git -C dir reset --hard",
    "git -c a=b -C d clean -fd",
    "git --git-dir=d --work-tree w reset --hard",
  ])
    expect(await mainDeny(command, main), command).not.toBeNull();
});

test("a global option with a value that the list missed does not hide a destructive verb", async () => {
  for (const command of [
    "git --attr-source HEAD reset --hard",
    "git --config-env foo=BAR reset --hard",
    'env -iS "git reset --hard"',
    'env -S "git reset --hard"',
    "sudo -iu root git reset --hard",
  ])
    expect(await mainDeny(command, main), command).not.toBeNull();
});

test("`--attr-source` and `--config-env` take a value, so a safe verb gets no deny", async () => {
  for (const command of [
    "git --config-env foo=BAR status",
    "git --config-env=foo=BAR status",
    "git --attr-source HEAD status",
  ])
    expect(await mainDeny(command, main), command).toBeNull();
});

test("an abbreviated long option reads as the full option", async () => {
  for (const command of [
    "git reset --har",
    "git reset --ha",
    "git checkout --forc main",
    "git switch --discard main",
    "git clean --forc -d",
    "git rm --forc -r .",
  ])
    expect(await mainDeny(command, main), command).not.toBeNull();
});

test("an abbreviated safe option keeps its meaning", async () => {
  expect(await mainDeny("git clean --force --dry", main)).toBeNull();
  expect(await mainDeny("git rm -rf --cach .", main)).toBeNull();
});
