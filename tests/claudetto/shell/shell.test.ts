// The shell reader of `plugins/claudetto/modules/shell/domain/shell.ts`, with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import {
  commands,
  parse,
} from "../../../plugins/claudetto/modules/shell/domain/shell.ts";
import { hiddenLevel } from "../../../plugins/claudetto/modules/shell/domain/shellkinds.ts";
import {
  stripWrappers,
  words,
} from "../../../plugins/claudetto/modules/shell/domain/wrappers.ts";
import {
  BRACE_WORDS_MAX,
  SHELL_SCAN_MAX_CHARS,
} from "../../../plugins/claudetto/modules/shell/limits.ts";

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

test("D35: the words of `$(( ))` are not a command, and each `$( )` in it is", () => {
  expect(
    commands(
      "echo $(( $(date +%s) - $(stat -Lf %m $d/a) )); cat $d/b | tail -3",
    ),
  ).toStrictEqual([
    ["date", "+%s"],
    ["stat", "-Lf", "%m", "$d/a"],
    ["echo", ""],
    ["cat", "$d/b"],
    ["tail", "-3"],
  ]);
  expect(commands(`echo "$(( (1 + 2) * 3 ))"`)).toStrictEqual([["echo", ""]]);
});

test("D35: a `$((` with no matching `))` is a substitution that holds a subshell", () => {
  expect(commands("echo $((rm -rf ~) )")).toContainEqual(["rm", "-rf", "~"]);
});

test("an unquoted variable in an argument splits into its words, and a quoted one stays 1 word", () => {
  const split = parse("F='-rf ~'; echo $F").commands[1];
  const whole = parse("F='-rf ~'; echo \"$F\"").commands[1];

  expect(split).toStrictEqual(["echo", "-rf", "~"]);
  expect(whole).toStrictEqual(["echo", "-rf ~"]);
});

test("a copy `Y=$X` takes the values of `X`, also for 2 values", () => {
  const one = parse("X=--force; Y=$X; git push $Y");
  const two = parse("if c; then X=a; else X=b; fi; Y=$X; echo $Y").commands;

  expect(one.commands.at(-1)).toStrictEqual(["git", "push", "--force"]);
  expect(one.unknown).toBe(false);
  expect(two).toContainEqual(["echo", "a"]);
  expect(two).toContainEqual(["echo", "b"]);
});

test("a copy of a name with no known value leaves the copy unreadable", () => {
  const { commands: found } = parse("Y=$X; $Y rm");

  expect(parse("Y=$X; $Y rm").unknown).toBe(true);
  expect(found[0]).toStrictEqual(["Y=$X"]);
});

test("a word with a quoted part and an unquoted `$NAME` splits only at the value", () => {
  const a = parse('F="c d"; echo "a b"$F').commands[1];
  const b = parse('F="c d"; echo "a $F"$F').commands[1];

  expect(a).toStrictEqual(["echo", "a bc", "d"]);
  expect(b).toStrictEqual(["echo", "a c dc", "d"]);
});

test("a name ends at a quote or a backslash, as in bash", () => {
  const single = parse("F=x; echo $F'a b'").commands[1];
  const double = parse('F=x; echo $F"a b"').commands[1];
  const empty = parse("F='c d'; echo $F''").commands[1];
  // biome-ignore lint/suspicious/noTemplateCurlyInString: the sample is a shell command
  const braced = parse("F='c d'; echo ${F}\"x\"").commands[1];
  const closed = parse('F=c; echo "$F"x').commands[1];
  const escaped = parse("F=c; echo $F\\a").commands[1];

  expect(single).toStrictEqual(["echo", "xa b"]);
  expect(double).toStrictEqual(["echo", "xa b"]);
  expect(empty).toStrictEqual(["echo", "c", "d"]);
  expect(braced).toStrictEqual(["echo", "c", "dx"]);
  expect(closed).toStrictEqual(["echo", "cx"]);
  expect(escaped).toStrictEqual(["echo", "ca"]);
});

test("a single-quoted value is literal text, and `eval` of a copy reads the names at that point", () => {
  const literal = parse("M=hi; echo '$M'; echo \"\\$M\"").commands;
  const evaled = parse(
    "X=echo; Y='$X'; X=git; eval \"$Y push --force\"",
  ).commands;
  const exported = parse("X=echo; export Y='$X'; X=git; bash -c \"$Y push\"");

  expect(literal[1]).toStrictEqual(["echo", "$M"]);
  expect(literal[2]).toStrictEqual(["echo", "$M"]);
  expect(evaled.at(-1)).toStrictEqual(["git", "push", "--force"]);
  expect(exported.commands.at(-1)).toStrictEqual(["git", "push"]);
});

test("`eval` of a copy reads the names at the point of the `eval`, not at the end", () => {
  const { commands: found } = parse(
    'X=git; Y=\'$X\'; eval "$Y status"; X=rm; eval "$Y -rf /"',
  );

  expect(found).toContainEqual(["git", "status"]);
  expect(found).toContainEqual(["rm", "-rf", "/"]);
});

test("a word with a brace expansion and a `$` outside quotes splits only when all its `$` are outside quotes or plain", () => {
  const exact = parse('F="c d"; echo {a,b}"x y"$F').commands[1];
  const mixed = parse('F="c d"; G="e f"; echo {a,b}"$G"$F');
  const literal = parse("F='c d'; echo {a,b}'$G'$F");

  expect(exact).toStrictEqual(["echo", "ax yc", "d", "bx yc", "d"]);
  expect(mixed.unknown).toBe(true);
  expect(literal.unknown).toBe(false);
  expect(literal.commands[1]).toStrictEqual(["echo", "a$Gc", "d", "b$Gc", "d"]);
});

test("a variable with 2 values gives a command for each value in its argument", () => {
  const out = parse("if x; then F=a; else F=b; fi; echo $F").commands;

  expect(out).toContainEqual(["echo", "a"]);
  expect(out).toContainEqual(["echo", "b"]);
});

test.each([
  'A=git; A+=" push --force"; $A',
  "X=ls; for i in 1 2; do $X /; X=rm; done",
  "X=ls; f() { $X /; }; X=rm; f",
  "X=rm; declare -n r=X; $r -rf /",
])("`parse` marks `%s` as unknown", (text) => {
  const { unknown } = parse(text);

  expect(unknown).toBe(true);
});

test("`parse` keeps the last plain value in straight-line code", () => {
  const text = "G=echo; G=git; $G push --force";

  const { commands: found, unknown } = parse(text);

  expect(unknown).toBe(false);
  expect(found.at(-1)).toStrictEqual(["git", "push", "--force"]);
});

test("an escaped `$` is no reference, also in a script and after a brace expansion", () => {
  const evaled = parse("F=a; eval rm \\\\\\$F").commands;
  const braced = parse("F=a; echo {x,y}\\$F").commands[1];

  expect(evaled.at(-1)).toStrictEqual(["rm", "$F"]);
  expect(braced).toStrictEqual(["echo", "x$F", "y$F"]);
});
