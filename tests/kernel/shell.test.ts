// The shell reader of `src/kernel/shell.ts`, with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import {
  BRACE_WORDS_MAX,
  SHELL_SCAN_MAX_CHARS,
} from "../../src/kernel/budget.ts";
import { words } from "../../src/kernel/shell/words.ts";
import { commands, parse } from "../../src/kernel/shell.ts";
import { hiddenLevel } from "../../src/kernel/shellkinds.ts";
import { stripWrappers } from "../../src/kernel/wrappers.ts";

test("`parse` gives `truncated` only for a text over the scan bound", () => {
  const word = "a";
  expect(parse(word.repeat(SHELL_SCAN_MAX_CHARS)).truncated).toBe(false);
  expect(parse(word.repeat(SHELL_SCAN_MAX_CHARS + 1)).truncated).toBe(true);
});

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

test("`commands` reads the substitutions of an unquoted heredoc body and not its text", () => {
  expect(commands("cat <<EOF\nhi there $(echo x)\nEOF\n")).toStrictEqual([
    ["cat"],
    ["echo", "x"],
  ]);
  expect(commands("cat <<EOF\n`echo z`\nEOF\n")).toStrictEqual([
    ["cat"],
    ["echo", "z"],
  ]);
  expect(commands("cat <<EOF\nhi there\nEOF\n")).toStrictEqual([["cat"]]);
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

// The parser holes F1 to F5 of the kernel review, one or more tests for each hole.

const RESET = ["git", "reset", "--hard"];

/** The commands of `text` with their wrappers removed. */
const stripped = (text: string): string[][] =>
  commands(text).map(stripWrappers);

test("F1: `env -S` gives the words of its value as the command", () => {
  expect(stripped("env -S 'git reset --hard'")).toEqual([RESET]);
  expect(stripped("env -S 'cat a.txt'")).toEqual([["cat", "a.txt"]]);
  expect(stripped("env --split-string='git reset --hard'")).toEqual([RESET]);
  expect(stripped("env -S'A=1 git reset --hard'")).toEqual([RESET]);
});

test("F1: the BSD `env -P` takes a path, which is not the command", () => {
  expect(stripped("env -P /usr/bin git reset --hard")).toEqual([RESET]);
});

test("F2: an escaped quote in an ANSI-C quote does not end it", () => {
  const all = commands("echo $'a\\'b'; git reset --hard");
  expect(all).toEqual([["echo", "a'b"], RESET]);
});

test("F2: the escapes of an ANSI-C quote are decoded", () => {
  expect(commands("$'\\x67it' reset --hard")).toEqual([RESET]);
  expect(commands("$'\\147\\151t' reset --hard")).toEqual([RESET]);
  expect(commands("$'\\u0067it' reset --hard")).toEqual([RESET]);
  expect(commands("echo $'a\\nb'")).toEqual([["echo", "a\nb"]]);
  expect(commands("echo $'\\q'")).toEqual([["echo", "\\q"]]);
});

test("F2: a `\\0` drops the rest of the ANSI-C quote", () => {
  expect(commands("$'git\\0x' reset --hard")).toEqual([RESET]);
});

test("F2: `$'` in double quotes is plain text", () => {
  expect(commands(`echo "$'a"; git reset --hard`)).toEqual([
    ["echo", "$'a"],
    RESET,
  ]);
});

test("F3: a heredoc delimiter with a quote inside it ends at its whole word", () => {
  const text = 'cat <<E"OF"\nx\nEOF\ngit reset --hard';
  expect(commands(text)).toContainEqual(RESET);
});

test("F3: the delimiters `\\EOF`, `'END-X'`, and `<<- EOF` are read whole", () => {
  expect(commands("cat <<\\EOF\n$(rm a)\nEOF\nls")).toEqual([["cat"], ["ls"]]);
  expect(commands("cat <<'END-X'\nx\nEND-X\nls")).toEqual([["cat"], ["ls"]]);
  expect(commands("cat <<- EOF\n\tx\n\tEOF\nls")).toEqual([["cat"], ["ls"]]);
});

test("F3: the body of an unquoted delimiter is still expanded", () => {
  expect(commands("cat <<EOF\n$(rm a)\nEOF")).toContainEqual(["rm", "a"]);
});

test("F4: `noglob`, `coproc`, and `caffeinate -i` are wrappers", () => {
  for (const wrapper of ["noglob", "coproc", "caffeinate -i"])
    expect(stripped(`${wrapper} git reset --hard`)).toEqual([RESET]);
  expect(stripped("caffeinate -t 60 git reset --hard")).toEqual([RESET]);
  expect(stripWrappers(["coproc", "N", "{", ...RESET])).toEqual(RESET);
});

test("F5: a name that a substitution wrote is unreadable, as a `$c` name is", () => {
  const [, argv] = commands("$(echo git) reset --hard");
  expect(argv).toEqual(["", "reset", "--hard"]);
  expect(hiddenLevel(argv as string[], undefined)).toBe(
    hiddenLevel(["$c", "reset", "--hard"], undefined),
  );
  expect(hiddenLevel(["A=b"], undefined)).toBe(0);
});

test("F5: the name of an unreadable command runs a held `while read` body", () => {
  const text =
    "while read c; do $(echo eval) $c; done <<'X'\ngit reset --hard\nX";
  expect(commands(text)).toContainEqual(RESET);
});

test("F5: an unquoted brace group expands to its words", () => {
  expect(commands("{git,reset,--hard}")).toEqual([RESET]);
  expect(commands("rm a{1..3}")).toEqual([["rm", "a1", "a2", "a3"]]);
  expect(commands("echo {a,b{c,d}}x")).toEqual([["echo", "ax", "bcx", "bdx"]]);
  expect(commands("echo {01..03..2} {c..a}")).toEqual([
    ["echo", "01", "03", "c", "b", "a"],
  ]);
});

test("F5: a quoted brace, `${`, and a group with no comma do not expand", () => {
  expect(commands("echo '{a,b}' \\{a,b}")).toEqual([
    ["echo", "{a,b}", "{a,b}"],
  ]);
  expect(commands(`echo \${a,b} {a} {}`)).toEqual([
    ["echo", `\${a,b}`, "{a}", "{}"],
  ]);
  expect(commands("{ git reset --hard; }")).toEqual([RESET]);
});

test("F5: a word that expands to more than `BRACE_WORDS_MAX` words is unreadable", () => {
  const text = `{1..${BRACE_WORDS_MAX + 1}} reset --hard`;
  expect(commands(text)).toEqual([["", "reset", "--hard"]]);
  expect(parse(`echo {1..${BRACE_WORDS_MAX}}`).commands[0]).toHaveLength(
    BRACE_WORDS_MAX + 1,
  );
});

test("`parse` lists each command that a lone `&` puts in the background", () => {
  expect(parse("sleep 9 &").background).toStrictEqual([["sleep", "9"]]);
  expect(parse("a& b; wait").background).toStrictEqual([["a"]]);
  expect(parse("x=$(a &)").background).toStrictEqual([["a"]]);
  expect(parse("(a; b) &").background).toStrictEqual([[]]);
});

test("`parse` gives no background job for `&&`, `&>`, `|&`, `>&`, a quote, or a heredoc body", () => {
  for (const text of [
    "a && b",
    "a &> f",
    "a |& b",
    "a >&2",
    "echo 'a &'",
    "cat <<E\nx &\nE",
  ])
    expect(parse(text).background).toStrictEqual([]);
});
