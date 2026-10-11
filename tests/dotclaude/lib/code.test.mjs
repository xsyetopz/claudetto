// The reader of code in any language in `lib/code.mjs`, with code as strings.
// No command runs.

import assert from "node:assert/strict";
import { test } from "node:test";
import { CODE_COMMAND_MAX_WORDS } from "../../../plugins/dotclaude/lib/budget.mjs";
import {
  codeCommands,
  codeWords,
} from "../../../plugins/dotclaude/lib/code.mjs";
import { parse } from "../../../plugins/dotclaude/lib/shell.mjs";

const has = (text, cmd) =>
  codeCommands(text).some((c) => c.join(" ").startsWith(cmd));

test("`codeCommands` reads a command in a string, a list, or a call", () => {
  assert.ok(has(`os.system("git stash")`, "git stash"));
  assert.ok(
    has(
      `run(["git", "-C", repo, "reset", "--hard"])`,
      "git -C repo reset --hard",
    ),
  );
  assert.ok(has("`git stash`", "git stash"));
  assert.ok(has(`x = 1; system('git stash')`, "git stash"));
});

test("`codeCommands` stops a command at the end of a statement and at the word bound", () => {
  assert.ok(!has(`f("git")\nstash()`, "git stash"));
  const long = codeCommands(`git ${"a ".repeat(100)}`)[0];
  assert.equal(long.length, CODE_COMMAND_MAX_WORDS);
});

test("`codeWords` gives each path-like word one time", () => {
  assert.deepEqual(
    codeWords(`open("tests/a.test.mjs", "w"); open('tests/a.test.mjs')`),
    ["open", "tests/a.test.mjs", "w"],
  );
});

test("`parse` lists the text that a program other than the shell runs as code", () => {
  const code = (text) => parse(text).code;
  assert.deepEqual(code("python3 - <<'EOF'\nprint(1)\nEOF"), ["print(1)\n"]);
  assert.deepEqual(code("node -e 'f(1)' a.js"), ["f(1)"]);
  assert.deepEqual(code("python3 <<< 'f(1)'"), ["f(1)"]);
  assert.deepEqual(code("cat > a.py <<'EOF'\nf(1)\nEOF\npython3 a.py"), [
    "f(1)\n",
  ]);
  assert.deepEqual(code("cat > a.md <<'EOF'\nf(1)\nEOF"), []);
  assert.deepEqual(code("bash <<'EOF'\nf 1\nEOF"), []);
  assert.deepEqual(code("git commit -m 'a (b)'"), []);
});
