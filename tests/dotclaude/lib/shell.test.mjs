// The shell reader of `lib/shell.mjs`, with commands as strings.
// No command runs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { commands, words } from "../../../plugins/dotclaude/lib/shell.mjs";
import { stripWrappers } from "../../../plugins/dotclaude/lib/wrappers.mjs";

test("`words` removes quotes and backslashes, also inside a word", () => {
  assert.deepEqual(words(`git commit -m "a b" 'c d'`), [
    "git",
    "commit",
    "-m",
    "a b",
    "c d",
  ]);
  assert.deepEqual(words("r''m \\rm a\\ b"), ["rm", "rm", "a b"]);
  assert.deepEqual(words(""), []);
});

test("`commands` splits on every operator and a newline", () => {
  assert.deepEqual(commands(`git commit -m "a b" && echo 'c d'; ls | wc`), [
    ["git", "commit", "-m", "a b"],
    ["echo", "c d"],
    ["ls"],
    ["wc"],
  ]);
  assert.deepEqual(commands("a || b & c\nd"), [["a"], ["b"], ["c"], ["d"]]);
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
  ])
    assert.ok(
      commands(text).some((c) => c.join(" ") === inner.join(" ")),
      text,
    );
});

test("`commands` skips heredoc bodies and keeps the command after them", () => {
  assert.deepEqual(commands("cat <<'EOF'\ngit stash\nEOF\ngit status"), [
    ["cat"],
    ["git", "status"],
  ]);
  assert.deepEqual(commands(undefined), []);
});

test("a quoted heredoc is read as a script when the command runs a script that the reader cannot see", () => {
  const has = (text, cmd) => commands(text).some((c) => c.join(" ") === cmd);
  const loop = (run) =>
    `while IFS= read -r c; do ${run}; done <<'CMDS'\njust test\ngit stash -q\nCMDS`;
  for (const run of [
    'bash -c "$c" > "$d/1.log" 2>&1',
    'eval "$c"',
    "$c",
    'sudo sh -c "$c"',
  ])
    assert.ok(has(loop(run), "git stash -q"), run);
  assert.ok(!has(loop('echo "$c"'), "git stash -q"));
  assert.ok(
    !has("bash -c 'echo hi'\ncat <<'EOF'\ngit stash\nEOF", "git stash"),
  );
});

test("`commands` ends on text that nests without bound", () => {
  assert.ok(Array.isArray(commands("$(".repeat(200))));
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
  ])
    assert.deepEqual(stripWrappers(argv.split(" ")), rest.split(" "), argv);
});

test("`stripWrappers` keeps a command that is not a wrapper", () => {
  assert.deepEqual(stripWrappers(["git", "-C", "x"]), ["git", "-C", "x"]);
  assert.deepEqual(stripWrappers(["constructor", "x"]), ["constructor", "x"]);
  assert.deepEqual(stripWrappers(["sudo"]), []);
  assert.deepEqual(stripWrappers([]), []);
});
