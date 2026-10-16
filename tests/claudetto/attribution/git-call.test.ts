// Tests of the readers of `domain/git-call.ts` and `domain/pr.ts`, with commands as strings.

import { expect, test } from "bun:test";
import {
  bypassOf,
  prCallsOf,
} from "../../../plugins/claudetto/slices/attribution/domain/git-call.ts";
import {
  endsWithLine,
  urlOf,
} from "../../../plugins/claudetto/slices/attribution/domain/pr.ts";

test("a commit that skips the hook has the bypass `--no-verify`", () => {
  for (const text of [
    "git commit --no-verify -m x",
    "git commit -nm x",
    "cd a && git commit -n -m x",
    "sudo git commit --no-verify",
  ])
    expect(bypassOf(text)).toBe("--no-verify");
});

test("a message that holds `-n` is not a bypass", () => {
  expect(bypassOf('git commit -m "-n"')).toBeUndefined();
  expect(bypassOf("git commit -m x")).toBeUndefined();
});

test("a config override of the hooks on a commit is a bypass", () => {
  expect(bypassOf("git -c core.hooksPath=/dev/null commit -m x")).toBe(
    "git config",
  );
  expect(bypassOf("git -c hook.x.event=commit-msg commit -m x")).toBe(
    "git config",
  );
  expect(bypassOf("git -c user.name=T commit -m x")).toBeUndefined();
});

test("an assignment of a git config variable on a commit is a bypass", () => {
  expect(bypassOf("GIT_CONFIG_COUNT=0 git commit -m x")).toBe("env");
  expect(bypassOf("env GIT_CONFIG_GLOBAL=/dev/null git commit -m x")).toBe(
    "env",
  );
});

test("`--config-env` of a hook key on a commit is a bypass in both forms", () => {
  expect(bypassOf("git --config-env=hook.x.command=V commit -m x")).toBe(
    "git config",
  );
  expect(bypassOf("git --config-env hook.x.enabled=V commit -m x")).toBe(
    "git config",
  );
});

test("an export, declare, typeset, or unset of a git config variable beside a commit is a bypass", () => {
  for (const text of [
    "export GIT_CONFIG_COUNT=0; git commit -m x",
    "declare -x GIT_CONFIG_COUNT=0 && git commit -m x",
    "typeset -x GIT_CONFIG_KEY_0=a; git commit -m x",
    "unset GIT_CONFIG_COUNT; git commit -m x",
    "unset -v GIT_CONFIG_COUNT && git commit -m x",
  ])
    expect(bypassOf(text)).toBe("env");
  expect(bypassOf("export PATH=/x; git commit -m x")).toBeUndefined();
  expect(bypassOf("unset GIT_CONFIG_COUNT")).toBeUndefined();
});

test("`env` that removes a git config variable or the whole environment before a commit is a bypass", () => {
  for (const text of [
    "env -u GIT_CONFIG_COUNT git commit -m x",
    "env -uGIT_CONFIG_COUNT git commit -m x",
    "env --unset=GIT_CONFIG_COUNT git commit -m x",
    "env --unset GIT_CONFIG_COUNT git commit -m x",
    "env -i git commit -m x",
    "env --ignore-environment git commit -m x",
    "env - git commit -m x",
  ])
    expect(bypassOf(text)).toBe("env");
  expect(bypassOf("env -u HOME git commit -m x")).toBeUndefined();
  expect(bypassOf("env A=1 git commit -m x")).toBeUndefined();
});

test("`git commit-tree` writes a commit with no hook, so it is a bypass", () => {
  expect(bypassOf("git commit-tree HEAD^{tree} -m x")).toBe("git commit-tree");
  expect(bypassOf("git -C d commit-tree T")).toBe("git commit-tree");
  expect(bypassOf("git log")).toBeUndefined();
});

test("a command that is not a commit is not a bypass", () => {
  expect(bypassOf("git status --no-verify")).toBeUndefined();
  expect(bypassOf("GIT_CONFIG_COUNT=0 git status")).toBeUndefined();
});

test("`gh pr create` and `gh pr edit` are pull request writes, with the target and `--repo`", () => {
  expect(prCallsOf("gh pr create --title T")).toEqual([
    { verb: "create", target: undefined, repo: undefined },
  ]);
  expect(prCallsOf("gh pr edit 7 --repo o/r --body-file b.md")).toEqual([
    { verb: "edit", target: "7", repo: "o/r" },
  ]);
  expect(prCallsOf("gh -R o/r pr edit 7")).toEqual([
    { verb: "edit", target: "7", repo: "o/r" },
  ]);
  expect(prCallsOf("gh pr edit --title T 7")[0]?.target).toBe("7");
  expect(prCallsOf("gh pr view 7")).toEqual([]);
});

test("a body ends with the line when its last line is the line", () => {
  expect(endsWithLine("Text.\n\nLine\n", "Line")).toBe(true);
  expect(endsWithLine("Text.\n\nLine\nOther", "Line")).toBe(false);
});

test("the URL of a pull request is read from the output of `gh pr create`", () => {
  expect(urlOf("https://github.com/o/r/pull/7\n")).toBe(
    "https://github.com/o/r/pull/7",
  );
  expect(urlOf("nothing")).toBeUndefined();
});
