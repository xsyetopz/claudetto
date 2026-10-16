// Tests of the destructive floor against the shell forms that hide the git verb (`git $(echo reset)`, `env git`, `command git`).
// The engine stub reads a real fixture folder for the `kind` and `.git` lookups, and no command runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../plugins/claudetto/slices/guard/adapters/mod.ts";
import { walk } from "../../../plugins/claudetto/slices/guard/domain/walk.ts";
import { tmpDir } from "../../support/repo.ts";

/** A checkout with a `.git` folder, which is the main checkout of a repository. */
const main = tmpDir("dc-guard-subst");
fs.mkdirSync(path.join(main, ".git"), { recursive: true });
fs.mkdirSync(path.join(main, "src"), { recursive: true });
await Bun.write(path.join(main, "src", "a.ts"), "export {};\n");

/** The engine ports that the guard reads: `fs.stat` for the kind of a path, relative to `cwd`. */
const engineIn = (cwd: string): EngineInterface =>
  ({
    session: { cwd: async () => cwd },
    fs: {
      stat: async (file: string) => {
        const s = await fs.promises.stat(path.resolve(cwd, file));
        return {
          kind: s.isDirectory() ? "dir" : s.isFile() ? "file" : "other",
          size: s.size,
          mtimeMs: s.mtimeMs,
          isLink: false,
        };
      },
    },
  }) as unknown as EngineInterface;

/** The `tool.call` event of a `Bash` command. */
const bash = (command: string) => ({
  tool: "Bash" as const,
  tool_use_id: "u1",
  command,
});

/** A call that reaches the guard: the engine would run it, so `next` answers `ok`. */
const passes = (() => ({ result: "ok" })) as never;

/** The destructive git commands in a form that hides the verb from a plain read. */
const HIDDEN_FLOOR = [
  "git $(echo reset) --hard",
  "git `echo reset` --hard",
  "git $'reset' --hard",
  "git$" + "{IFS}reset$" + "{IFS}--hard",
  "env git reset --hard",
  "command git reset --hard",
  "xargs git reset --hard",
  "git -c user.name=x reset --hard",
  "git --no-pager reset --hard",
  "alias g=git; g reset --hard",
  "env git clean -fd",
  "command git stash drop",
];

test("a destructive git command in a hidden form is denied in the main session", async () => {
  const allowed: string[] = [];
  for (const command of HIDDEN_FLOOR) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});

/**
 * The forms that bash runs as a guarded git verb, which an alias or a nested split hides from a plain read.
 * An alias on the same line as its use does not expand in bash, and the raw words still hold the verb.
 */
const ALIAS_AND_SPLIT = [
  "alias git=echo; git reset --hard",
  "alias git=echo; unalias git; git reset --hard",
  "alias git=echo; unalias -a; git reset --hard",
  "alias g=git\ng reset --hard",
  "alias g=git; g reset --hard",
  "alias b=git\nalias a=b\na reset --hard",
  "git$" + "{x:-$IFS}reset --hard",
  "bash -c 'git$" + "{IFS}reset --hard'",
];

test("an alias or a nested split that hides a guarded git verb is denied in the main session", async () => {
  const allowed: string[] = [];
  for (const command of ALIAS_AND_SPLIT) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});

test("a quoted $IFS stays one argument of git, and the command is allowed", async () => {
  const command = "git commit -m '$IFS'";
  expect(walk(command)[0]?.words).toStrictEqual([
    "git",
    "commit",
    "-m",
    "$IFS",
  ]);
  const out = await onBashCall(engineIn(main), bash(command), passes);
  expect("deny" in out).toBe(false);
});

/**
 * An `alias` that a wrapper or a spelled-out name hides from the alias reader.
 * Bash sets `g` on the first line and runs `git reset --hard` on the next line.
 */
const ALIAS_WRAPPED = [
  "command alias g=git\ng reset --hard",
  "builtin alias g=git\ng reset --hard",
  "al\\ias g=git\ng reset --hard",
];

test("an alias set behind a wrapper or a spelled-out name still denies a guarded git verb", async () => {
  const allowed: string[] = [];
  for (const command of ALIAS_WRAPPED) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});

/**
 * An alias body with a command separator runs two commands, and the use of the alias
 * gives its arguments to the last one, so the git verb follows the separator.
 */
const ALIAS_BODY = [
  "alias g='true; git'\ng reset --hard",
  "alias g='echo; git'\ng reset --hard",
  "alias g='true && git'\ng reset --hard",
  "alias g='false || git'\ng reset --hard",
  "alias g='true | git'\ng reset --hard",
];

test("an alias body with a separator still denies a guarded git verb", async () => {
  const allowed: string[] = [];
  for (const command of ALIAS_BODY) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});

/**
 * A positional or special parameter that is empty when the shell has no arguments.
 * Bash removes it from the word, so `git$9 reset` runs `git reset`.
 * The first form already denies on `33280fe9`, because its verb word is unknown.
 */
const EMPTY_PARAM = [
  "git$9 reset --hard",
  "$9 git reset --hard",
  "git$@ reset --hard",
  "git$* reset --hard",
  "git$IFS$9reset --hard",
];

test("an empty positional or special parameter does not hide a guarded git verb", async () => {
  const allowed: string[] = [];
  for (const command of EMPTY_PARAM) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if (!("deny" in out)) allowed.push(command);
  }
  expect(allowed).toStrictEqual([]);
});

test("a normal command near each alias, parameter, and quote fix is allowed", async () => {
  const denied: string[] = [];
  for (const command of [
    "alias ll='ls -l'\nll",
    "alias ll='ls -l'",
    "alias g='true; git'",
    "command ls",
    "command alias ll='ls -l'\nll",
    "echo $9",
    "echo $9 $1",
    "git commit -m 'a; b'",
    "git commit -m '$9'",
  ]) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    if ("deny" in out) denied.push(command);
  }
  expect(denied).toStrictEqual([]);
});
