// Tests of the shell forms that the `rm` rule of the guard reads (design D28).
// Each command is a string for the rule. Nothing runs it.

import { expect, test } from "bun:test";
import { rmOutside } from "../../plugins/dotclaude/features/guard/rules.mjs";

const ctx = {
  cwd: "/w/app",
  root: "/w/app",
  home: "/h",
  safe: ["/tmp"],
  tmp: "/var/T",
};

test("a variable that a later segment sets in an unreadable form is forgotten", () => {
  for (const command of [
    "X=$(mktemp -d); X=${X:0:1}etc; rm -rf $X",
    "X=$(mktemp -d); X=${X%/*}; rm -rf $X",
    "X=$(mktemp -d); case a in a) X=/etc;; esac; rm -rf $X",
    "X=$(mktemp -d); f() { X=/etc; }; f; rm -rf $X",
    "X=$(mktemp -d); function f { X=/etc; }; f; rm -rf $X",
    "X=$(mktemp -d); X=/etc true; rm -rf $X",
  ])
    expect(rmOutside(command, ctx)).toEqual(["$X"]);
});

test("a change of directory makes a relative target unknown", () => {
  for (const command of [
    "cd .. && rm -rf other",
    "pushd /etc; rm -rf x",
    "popd; rm -rf ./x",
    "(cd /; rm -rf *)",
  ])
    expect(rmOutside(command, ctx)).toHaveLength(1);
  expect(rmOutside("cd /etc && rm -rf /tmp/x", ctx)).toEqual([]);
});

test("a command substitution or a shell script string is scanned", () => {
  for (const command of [
    "echo $(rm -rf ~)",
    "echo `rm -rf ~`",
    "bash -c 'rm -rf ~'",
    "sh -c 'echo a; rm -rf ~'",
    'zsh -c "rm -rf ~"',
    "sudo bash -lc 'rm -rf ~'",
    "eval 'rm -rf ~'",
  ])
    expect(rmOutside(command, ctx)).toEqual(["~"]);
  expect(rmOutside("echo $(date); bash -c 'rm -rf build'", ctx)).toEqual([]);
});

test("a prefix command with its options does not hide the `rm`", () => {
  for (const command of [
    "env rm -rf ~",
    "env -i A=b rm -rf ~",
    "nice rm -rf ~",
    "nice -n 5 rm -rf ~",
    "timeout 5 rm -rf ~",
    "timeout -s KILL 5 rm -rf ~",
    "exec rm -rf ~",
    "command rm -rf ~",
    "builtin rm -rf ~",
    "sudo -u root rm -rf ~",
    "xargs -n 1 rm -rf ~",
  ])
    expect(rmOutside(command, ctx)).toEqual(["~"]);
});

test("quotes and backslashes in the command word are removed", () => {
  for (const command of [
    "\\rm -rf ~",
    "r''m -rf ~",
    'r"m" -rf ~',
    "'rm' -rf ~",
  ])
    expect(rmOutside(command, ctx)).toEqual(["~"]);
});

test("`~name` and a brace expansion are unknown paths", () => {
  expect(rmOutside("rm -rf ~root", ctx)).toEqual(["~root"]);
  expect(rmOutside("rm -rf {/etc,x}", ctx)).toEqual(["{/etc,x}"]);
  expect(rmOutside("rm -rf build/{a,b}", ctx)).toEqual(["build/{a,b}"]);
});
