// The reader of code in any language in `lib/code.ts`, with code as strings.
// No command runs.

import { expect, test } from "bun:test";
import { CODE_COMMAND_MAX_WORDS } from "../../../plugins/dotclaude/lib/budget.ts";
import {
  codeCommands,
  codeWords,
} from "../../../plugins/dotclaude/lib/code.ts";
import { parse } from "../../../plugins/dotclaude/lib/shell.ts";

const has = (text: string, cmd: string) =>
  codeCommands(text).some((c) => c.join(" ").startsWith(cmd));

test("`codeCommands` reads a command in a string, a list, or a call", () => {
  expect(has(`os.system("git stash")`, "git stash")).toBeTruthy();
  expect(
    has(
      `run(["git", "-C", repo, "reset", "--hard"])`,
      "git -C repo reset --hard",
    ),
  ).toBeTruthy();
  expect(has("`git stash`", "git stash")).toBeTruthy();
  expect(has(`x = 1; system('git stash')`, "git stash")).toBeTruthy();
});

test("`codeCommands` stops a command at the end of a statement and at the word bound", () => {
  expect(!has(`f("git")\nstash()`, "git stash")).toBeTruthy();
  const long = codeCommands(`git ${"a ".repeat(100)}`)[0] as string[];
  expect(long.length).toBe(CODE_COMMAND_MAX_WORDS);
});

test("`codeWords` gives each path-like word one time", () => {
  expect(
    codeWords(`open("tests/a.test.mjs", "w"); open('tests/a.test.mjs')`),
  ).toStrictEqual(["open", "tests/a.test.mjs", "w"]);
});

test("`parse` lists the text that a program other than the shell runs as code", () => {
  const code = (text: string) => parse(text).code;
  expect(code("python3 - <<'EOF'\nprint(1)\nEOF")).toStrictEqual([
    "print(1)\n",
  ]);
  expect(code("node -e 'f(1)' a.js")).toStrictEqual(["f(1)"]);
  expect(code("python3 <<< 'f(1)'")).toStrictEqual(["f(1)"]);
  expect(code("cat > a.py <<'EOF'\nf(1)\nEOF\npython3 a.py")).toStrictEqual([
    "f(1)\n",
  ]);
  expect(code("cat > a.md <<'EOF'\nf(1)\nEOF")).toStrictEqual([]);
  expect(code("bash <<'EOF'\nf 1\nEOF")).toStrictEqual([]);
  expect(code("git commit -m 'a (b)'")).toStrictEqual([]);
});
