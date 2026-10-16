// The script files that a `Bash` command runs, for the git ask and the write ask (decision of the user 2026-10-10).
// A script that Claude wrote before, such as `x.py` from `Write`, can run `git stash` or write a test file,
// so the asks read the file that a command runs: `./x.py`, `python3 x.py`, `node tools/x.mjs`, `bash run.sh`, or `deno run x.ts`.
// The file is code in any language, and `lib/code.ts` reads its words.
// A test run (`node --test`, `pytest`, `go test`) is not read, because a test file can name a command as data,
// and the asks for an edit of a test file already cover a change to it.
// A file tool (`cp`, `rm`, `sed`) does not run the file, so its files are not read.
// Limits: the asks read only the file that the command names, and not the modules that it imports.
// A file larger than `FILE_MAX_BYTES` counts as unread, as in the other checks.

import { parse } from "../../../../../kernel/shell.ts";
import { runsCode, SHELLS } from "../../../../../kernel/shellkinds.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import { SCRIPT_FILES_MAX } from "../limits.ts";
import { resolve } from "./paths.ts";
import type { Reader } from "./text.ts";

/** The texts of the script files of a command: `shell` for a shell file, and `code` for another language. */
export type Scripts = { shell: string[]; code: string[] };

/** The test runners. A command with one of them in its first three words is a test run. */
const TEST_RUNNERS = new Set([
  "pytest",
  "jest",
  "vitest",
  "mocha",
  "ava",
  "tap",
  "rspec",
  "phpunit",
  "unittest",
  "nose2",
]);

/** The commands that copy, move, delete, or edit a file, and do not run it. `sed -f` and `awk -f` run a script file, and `scriptFile` reads it. */
const FILE_TOOLS = new Set([
  "cp",
  "mv",
  "rm",
  "ln",
  "install",
  "chmod",
  "chown",
  "touch",
  "truncate",
  "unlink",
  "sed",
  "awk",
  "stat",
  "file",
  "open",
  "code",
  "vim",
  "nano",
]);

/** True when `words` (with no wrapper) is a test run: `node --test`, `pytest`, `npx jest`, `go test`, or `python -m pytest`. */
const testRun = (words: string[]): boolean => {
  if (words.includes("--test") || words[1] === "test") return true;
  return words.slice(0, 3).some((w) => TEST_RUNNERS.has(baseName(w)));
};

/** True when `word` can name a script file: it has a `/` or a `.`, and no variable, glob, or `=`. */
const fileLike = (word: string): boolean =>
  /[./]/.test(word) && !/[$*?[{=]/.test(word);

/** The file that `argv` runs, or undefined: the command itself when it is a path, else the first path-like operand of a program or a shell. */
const scriptFile = (argv: string[]): string | undefined => {
  const words = stripWrappers(argv);
  const [head = "", ...rest] = words;
  if (head.includes("/") && fileLike(head)) return head;
  const name = baseName(head);
  if (!(runsCode(argv) || SHELLS.test(name))) return undefined;
  const f = rest.indexOf("-f");
  if ((name === "sed" || name === "awk") && f >= 0) return rest[f + 1];
  if (FILE_TOOLS.has(name) || testRun(words)) return undefined;
  if (SHELLS.test(name) && rest.some((w) => /^-[A-Za-z]*c/.test(w)))
    return undefined;
  return rest.find((w) => !w.startsWith("-") && fileLike(w));
};

/** No script files. */
export const NO_SCRIPTS: Scripts = { shell: [], code: [] };

/** True when the text starts with the shebang of a shell, such as `#!/bin/sh` or `#!/usr/bin/env bash`. */
const shellShebang = (text: string): boolean =>
  /^#!\S*?\b(?:env\s+)?(?:ba|z|da|k)?sh\b/.test(text);

/**
 * The texts of the script files that `command` runs, read with `read` from the project root `root`, as `{ shell, code }`.
 * A file that a shell runs, or that has the shebang of a shell, is `shell`. Any other file is `code` in another language.
 * A path under `~` is under `home`. A file that `read` cannot read gives no text.
 */
export const scriptTexts = async (
  command: string,
  root: string,
  read: Reader,
  home: string | undefined,
): Promise<Scripts> => {
  const out: Scripts = { shell: [], code: [] };
  const seen = new Set();
  for (const argv of parse(command).commands) {
    const file = scriptFile(argv);
    if (!file || (file.startsWith("~/") && !home)) continue;
    const at = resolve(root, file.replace(/^~(?=\/)/, home as string));
    if (seen.has(at)) continue;
    seen.add(at);
    const text = await read(at);
    if (typeof text === "string") {
      const byShell = SHELLS.test(baseName(stripWrappers(argv)[0] ?? ""));
      out[byShell || shellShebang(text) ? "shell" : "code"].push(text);
    }
    if (seen.size >= SCRIPT_FILES_MAX) break;
  }
  return out;
};

/**
 * The parse of `command` with the script files that it runs:
 * the commands, redirects, and code of each shell file join those of the command, and `fileCode` lists the files in other languages.
 * A guard reads only the commands of `fileCode`, because a script names many paths that it only reads.
 */
export const withScripts = (command: string, scripts: Scripts = NO_SCRIPTS) => {
  const all = [parse(command), ...scripts.shell.map(parse)];
  return {
    commands: all.flatMap((p) => p.commands),
    redirects: all.flatMap((p) => p.redirects),
    code: all.flatMap((p) => p.code),
    fileCode: scripts.code,
    truncated: all.some((p) => p.truncated),
  };
};
