// The shell reader of `src/kernel/shell.ts`, with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import { commands, words } from "../../src/kernel/shell.ts";
import { stripWrappers } from "../../src/kernel/wrappers.ts";

test("`words` removes quotes and backslashes, also inside a word", () => {
  expect(words(`git commit -m "a b" 'c d'`)).toStrictEqual([
    "git",
    "commit",
    "-m",
    "a b",
    "c d",
  ]);
  expect(words("r''m \\rm a\\ b")).toStrictEqual(["rm", "rm", "a b"]);
  expect(words("")).toStrictEqual([]);
});

test("a substitution in a double-quoted script keeps its source text in the script", () => {
  expect(commands(`bash -c "git $(echo reset) --hard"`)).toContainEqual([
    "bash",
    "-c",
    "git $(echo reset) --hard",
  ]);
  expect(commands(`bash -c "git $(echo reset) --hard"`)).toContainEqual([
    "git",
    "",
    "--hard",
  ]);
  expect(commands(`git "$(echo reset)" --hard`)).toContainEqual([
    "git",
    "",
    "--hard",
  ]);
  expect(commands(`git $(echo reset)--hard`)).toContainEqual([
    "git",
    "$(echo reset)--hard",
  ]);
});

test("a substitution that is harmless in a double-quoted script keeps its decision", () => {
  expect(commands(`bash -c "echo $(date)"`)).toContainEqual([
    "bash",
    "-c",
    "echo $(date)",
  ]);
  expect(commands(`rm -rf $(pwd)/build`)).toContainEqual([
    "rm",
    "-rf",
    "$(pwd)/build",
  ]);
});

test("`commands` splits on every operator and a newline", () => {
  expect(commands(`git commit -m "a b" && echo 'c d'; ls | wc`)).toStrictEqual([
    ["git", "commit", "-m", "a b"],
    ["echo", "c d"],
    ["ls"],
    ["wc"],
  ]);
  expect(commands("a || b & c\nd")).toStrictEqual([["a"], ["b"], ["c"], ["d"]]);
});

test("`commands` reads nested commands", () => {
  for (const [text, inner] of [
    ["echo $(git stash)", ["git", "stash"]],
    ["echo `git stash`", ["git", "stash"]],
    ['echo "$(git stash)"', ["git", "stash"]],
    ["bash -c 'git stash'", ["git", "stash"]],
    ["sudo sh -c 'a; git stash'", ["git", "stash"]],
    ['eval "git stash"', ["git", "stash"]],
    ["echo $(echo $(git stash))", ["git", "stash"]],
  ] as [string, string[]][])
    expect(
      commands(text).some((c) => c.join(" ") === inner.join(" ")),
      text,
    ).toBeTruthy();
});

test("`commands` skips heredoc bodies and keeps the command after them", () => {
  expect(commands("cat <<'EOF'\ngit stash\nEOF\ngit status")).toStrictEqual([
    ["cat"],
    ["git", "status"],
  ]);
  expect(commands(undefined)).toStrictEqual([]);
});

test("a quoted heredoc is read as a script when the command runs a script that the reader cannot see", () => {
  const has = (text: string, cmd: string) =>
    commands(text).some((c) => c.join(" ") === cmd);
  const loop = (run: string) =>
    `while IFS= read -r c; do ${run}; done <<'CMDS'\njust test\ngit stash -q\nCMDS`;
  for (const run of [
    'bash -c "$c" > "$d/1.log" 2>&1',
    'eval "$c"',
    "$c",
    'sudo sh -c "$c"',
  ])
    expect(has(loop(run), "git stash -q"), run).toBeTruthy();
  expect(!has(loop('echo "$c"'), "git stash -q")).toBeTruthy();
  expect(
    !has("bash -c 'echo hi'\ncat <<'EOF'\ngit stash\nEOF", "git stash"),
  ).toBeTruthy();
});

test("`commands` ends on text that nests without bound", () => {
  expect(Array.isArray(commands("$(".repeat(200)))).toBeTruthy();
});

test("`stripWrappers` removes each wrapper with its options and values", () => {
  for (const [argv, rest] of [
    ["sudo -u root git x", "git x"],
    ["env -i A=b git x", "git x"],
    ["env -u HOME git x", "git x"],
    ["nice -n 5 git x", "git x"],
    ["timeout 5 git x", "git x"],
    ["timeout -s KILL 5 git x", "git x"],
    ["xargs -n 1 git x", "git x"],
    ["stdbuf -o L git x", "git x"],
    ["A=b C=d git x", "git x"],
    ["/usr/bin/env command nohup time exec git x", "git x"],
    ["sudo nice timeout 5 env A=b git x", "git x"],
  ] as [string, string][])
    expect(stripWrappers(argv.split(" ")), argv).toStrictEqual(rest.split(" "));
});

test("`stripWrappers` keeps a command that is not a wrapper", () => {
  expect(stripWrappers(["git", "-C", "x"])).toStrictEqual(["git", "-C", "x"]);
  expect(stripWrappers(["constructor", "x"])).toStrictEqual([
    "constructor",
    "x",
  ]);
  expect(stripWrappers(["sudo"])).toStrictEqual([]);
  expect(stripWrappers([])).toStrictEqual([]);
});
