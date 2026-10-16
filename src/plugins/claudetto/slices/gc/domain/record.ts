// The record of the outputs of a session, and the rules that find an output in a tool call.
// An output is a path that a session made outside the project: a `mktemp` folder, a worktree, a copy, a sandbox config folder, or a scratch file.
// The record format is in `src/kernel/gc-record.ts`, because the `worktree` hooks write records too.
// A hooks module imports this file, so it has no `node:` import, no `bun:` import, and no `Bun`.

import type { Kind } from "../../../../../kernel/gc-record.ts";
import { commands } from "../../../../../kernel/shell.ts";

export {
  type GcRecord,
  gcDirOf,
  type Kind,
  parseRecords,
  serialize,
  withOutputs,
} from "../../../../../kernel/gc-record.ts";

/** A path that a tool call made, before it gets the session and the time. */
export interface Output {
  readonly path: string;
  readonly kind: Kind;
}

/** The folders that hold the scratch files, when the environment gives no `TMPDIR`. */
export const TEMP_PREFIXES: readonly string[] = [
  "/tmp/",
  "/private/tmp/",
  "/var/folders/",
  "/private/var/folders/",
];

const WORKTREE_PART = "/.claude/worktrees/";

/** True when `path` is absolute in the POSIX form or in the Windows form. */
const isAbsolute = (path: string): boolean =>
  /^(?:\/|[A-Za-z]:[\\/])/.test(path);

/** `path` with the `.` and `..` parts removed, for a POSIX path. */
const normalize = (path: string): string => {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return `/${out.join("/")}`;
};

/** The absolute form of `path`, from `cwd`. A path that starts with `~` or `$` stays out, because the hook cannot expand it. */
const absolute = (path: string, cwd: string): string | undefined => {
  if (/^[~$]/.test(path)) return undefined;
  if (/^[A-Za-z]:[\\/]/.test(path)) return path;
  return normalize(isAbsolute(path) ? path : `${cwd}/${path}`);
};

/** The words of `argv` that are not options. */
const operands = (argv: readonly string[]): string[] =>
  argv.filter((word) => !word.startsWith("-"));

/** True when the option words of `cp` ask for a copy of a folder. */
const copiesFolder = (argv: readonly string[]): boolean =>
  argv.some(
    (word) =>
      word === "--recursive" ||
      word === "--archive" ||
      /^-[A-Za-z]*[rRa][A-Za-z]*$/.test(word),
  );

/** The outputs of one command, as its words `argv` show them. */
const outputsOfCommand = (argv: readonly string[], cwd: string): Output[] => {
  const out: Output[] = [];
  const add = (kind: Kind, path: string | undefined): void => {
    const full = path === undefined ? undefined : absolute(path, cwd);
    if (full !== undefined) out.push({ path: full, kind });
  };
  for (const word of argv) {
    const config = /^CLAUDE_CONFIG_DIR=(.+)$/.exec(word);
    if (config) add("config", config[1]);
  }
  const at = argv.findIndex((word) => !/^\w+=/.test(word));
  const [name, sub, ...rest] = at < 0 ? [] : argv.slice(at);
  if (name === "git" && sub === "worktree" && rest[0] === "add") {
    // `git worktree add [-b branch] <path> [<commit>]`: the option `-b` and `-B` take a value.
    const args = rest.slice(1);
    const free = args.filter(
      (word, i) => !word.startsWith("-") && !/^-[bB]$/.test(args[i - 1] ?? ""),
    );
    add("worktree", free[0]);
  } else if (name === "git" && sub === "clone") {
    const free = operands(rest);
    add("copy", free.length > 1 ? free.at(-1) : undefined);
  } else if (name === "cp" && copiesFolder(argv)) {
    const free = operands([sub ?? "", ...rest].filter(Boolean));
    add("copy", free.length > 1 ? free.at(-1) : undefined);
  }
  return out;
};

/** True when `file` is absolute and inside a temp folder. `temps` are the temp folders of the environment. */
const inTemp = (file: string, temps: readonly string[]): boolean =>
  isAbsolute(file) &&
  [...TEMP_PREFIXES, ...temps].some(
    (prefix) =>
      prefix.length > 1 && file.startsWith(prefix.replace(/\/*$/, "/")),
  );

/** The paths that `mktemp` printed. A line is a path when it is absolute and inside a temp folder, so other output of the command is not a record. */
const mktempOutputs = (stdout: string, temps: readonly string[]): Output[] =>
  stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => inTemp(line, temps))
    .map((path) => ({ path, kind: "temp" as const }));

/**
 * The outputs of a `Bash` call: the folder of each `mktemp`, the path of each `git worktree add`, `git clone`, and `cp -r`, and the value of each `CLAUDE_CONFIG_DIR=`.
 * `cwd` is the folder where the command ran, `stdout` is the output of the call, and `temps` are the temp folders of the environment.
 */
export const outputsOfBash = (
  command: string,
  stdout: string,
  cwd: string,
  temps: readonly string[] = [],
): Output[] => {
  const argvs = commands(command);
  const found = argvs.flatMap((argv) => outputsOfCommand(argv, cwd));
  const mktemp = argvs.some((argv) =>
    argv.some((word) => word === "mktemp" || word.endsWith("/mktemp")),
  );
  return mktemp ? [...mktempOutputs(stdout, temps), ...found] : found;
};

/** The scratch output of a `Write` call: the file, when it is in a temp folder. `temps` are the temp folders of the environment. */
export const outputOfWrite = (
  file: string,
  temps: readonly string[],
): Output | undefined => {
  return inTemp(file, temps) ? { path: file, kind: "scratch" } : undefined;
};

/** The fields of a `Bash` result that name a file of a background task or of a large output. */
export interface BashResultPaths {
  readonly backgroundOutputPath?: unknown;
  readonly persistedOutputPath?: unknown;
}

/**
 * The task outputs of a `Bash` result: the output file of a background task and the file of a large output.
 * A path outside the temp folders and the worktree folder is recorded too, and the sweep keeps it and reports it.
 */
export const taskOutputsOf = (result: BashResultPaths | undefined): Output[] =>
  [result?.backgroundOutputPath, result?.persistedOutputPath]
    .filter((p): p is string => typeof p === "string" && isAbsolute(p))
    .map((path) => ({ path, kind: "task" as const }));

/** True when a `Bash` command can make an output, so a command that cannot makes no parse. */
export const mayMakeOutput = (command: string): boolean =>
  /mktemp|worktree|clone|\bcp\b|CLAUDE_CONFIG_DIR/.test(command);

/** The project folder of a worktree path, or undefined when the path is not in a `.claude/worktrees/` folder. */
export const projectOfWorktree = (path: string): string | undefined => {
  const at = path.indexOf(WORKTREE_PART);
  return at > 0 ? path.slice(0, at) : undefined;
};
