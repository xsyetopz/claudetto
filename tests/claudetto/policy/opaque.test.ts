// The commands that run a program the gate cannot read (`domain/opaque.ts`).

import { expect, test } from "bun:test";
import { scriptOf } from "../../../src/plugins/claudetto/slices/policy/domain/opaque.ts";

test("a known read, `git`, `gh`, a network client, and `cd` are not opaque", () => {
  for (const command of [
    "ls -la && cat a.txt | grep x",
    "git status && git push",
    "gh pr view 3",
    "curl -s https://api.github.com/repos/a/b",
    "cd sub",
  ])
    expect(scriptOf(command).opaque, command).toBe(false);
});

test("a script, a build, an interpreter, and code in an argument are opaque", () => {
  for (const command of [
    "./release.sh",
    "make publish",
    "npm run deploy",
    "bash -c 'gh pr create'",
    "ls && python3 tool.py",
    "find . -exec rm {} +",
  ])
    expect(scriptOf(command).opaque, command).toBe(true);
});

test("the `cd` folders of a command are kept in order, and a dynamic folder is not", () => {
  expect(scriptOf("cd /work/a && cd sub && make").dirs).toEqual([
    "/work/a",
    "/work/a/sub",
  ]);
  expect(scriptOf("cd $HOME/x && make").dirs).toEqual([]);
});
