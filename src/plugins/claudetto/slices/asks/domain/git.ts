// The git ask (design D34, case S2): `git stash`, `git checkout -- <path>`, `git restore <path>`, and `git reset`
// move or discard work that the user or other sessions share.
// `features/guard/` asks only for foreign repositories, so these commands have no ask there.
// The functions are pure and read no file.

import { SHELL_SCAN_MAX_CHARS } from "../../../../../kernel/budget.ts";
import { GIT_VALUE_OPTIONS } from "../../../../../kernel/gitopts.ts";
import { stripWrappers } from "../../../../../kernel/wrappers.ts";
import {
  GIT_MOVES_WORK,
  GIT_NAME_HIDDEN,
  GIT_SUB_HIDDEN,
  GIT_TOO_LONG,
} from "../prompts.ts";
import { codeCommands } from "./code.ts";
import { NO_SCRIPTS, type Scripts, withScripts } from "./scripts.ts";

/** A git call: the subcommand and the words after it. */
export type GitCall = { sub: string; args: string[] };

/** The shape of the arguments of a git subcommand: the flags, the words before `--`, and the index of `--`. */
type ArgShape = { dashes: number; flags: string[]; plain: string[] };

/**
 * The git subcommand of `argv` and its arguments, or `null` when the command is not git.
 * `sub` is `""` when `xargs` gives the subcommand from its input.
 */
export const gitCall = (argv: string[]): GitCall | null => {
  const words = stripWrappers(argv);
  if (words[0]?.replace(/^.*\//, "") !== "git") return null;
  let i = 1;
  // An array of options (`git "${OPTS[@]}" commit`) stands before the subcommand.
  const option = (w: string) =>
    w.startsWith("-") || /^\$\{\w+\[[@*]\]\}$/.test(w);
  for (; i < words.length && option(words[i] as string); i++)
    if (GIT_VALUE_OPTIONS.has(words[i] as string)) i++;
  if (words[i] !== undefined)
    return { sub: words[i] as string, args: words.slice(i + 1) };
  return argv.some((w) => /^(?:.*\/)?(?:xargs|parallel)$/.test(w))
    ? { sub: "", args: [] }
    : null;
};

/** True when the reader cannot see the subcommand: it comes from a variable, a substitution, or the input of `xargs`. */
const unknownSub = (sub: string): boolean => sub === "" || sub.startsWith("$");

/**
 * True when the name of the command in `argv` is empty, or a bare variable that has arguments, so the reader cannot see which command runs.
 * A lone variable is the text of a `bash -c "$c"` loop, which the reader sees as a command of its own.
 */
const hiddenName = (argv: string[]): boolean => {
  const words = stripWrappers(argv);
  if (words.length === 0) return false;
  const name = words[0] as string;
  return name === "" || (words.length > 1 && /^\$(?:\w+|\{\w+\})$/.test(name));
};

/** The subcommands of `stash` that leave the tree as it is. */
const STASH_READS = new Set(["list", "show", "create", "store"]);
const REF =
  /^(?:HEAD|ORIG_HEAD|FETCH_HEAD|MERGE_HEAD|[0-9a-f]{7,40}|origin\/.*|upstream\/.*|refs\/.*)$|[~^@:]/;

/** The flags (not `--`), the words before `--`, and the index of `--` in `args`. */
const shape = (args: string[]): ArgShape => {
  const dashes = args.indexOf("--");
  return {
    dashes,
    flags: args.filter((a) => a.startsWith("-") && a !== "--"),
    plain: args.filter(
      (a, i) => !a.startsWith("-") && (dashes < 0 || i < dashes),
    ),
  };
};

const checkoutMoves = (args: string[]): boolean => {
  const { dashes, flags } = shape(args);
  return (
    (dashes >= 0 && args.length > dashes + 1) ||
    args.includes(".") ||
    flags.some((f) => f === "-f" || f === "--force")
  );
};

const restoreMoves = (args: string[]): boolean => {
  const { flags } = shape(args);
  const staged = flags.includes("--staged") || flags.includes("-S");
  const worktree = flags.includes("--worktree") || flags.includes("-W");
  const paths = args.filter(
    (a, i) =>
      !a.startsWith("-") && !/^(?:-s|--source)$/.test(args[i - 1] as string),
  );
  return (paths.length > 0 || flags.includes("-p")) && (!staged || worktree);
};

const resetMoves = (args: string[]): boolean => {
  const { dashes, flags, plain } = shape(args);
  if (flags.some((f) => /^--(?:hard|soft|mixed|merge|keep)$/.test(f)))
    return true;
  // `git reset <path>` and `git reset <ref> <path>` change the index only.
  if (dashes >= 0 || plain.length !== 1) return false;
  return REF.test(plain[0] as string) || !/[./]/.test(plain[0] as string);
};

/** For each git subcommand that can move or discard work, the test of its arguments. Any other subcommand moves nothing. */
const MOVES_WORK = new Map<string, (args: string[]) => boolean>([
  ["stash", (args) => !STASH_READS.has(args[0] as string)],
  ["checkout", checkoutMoves],
  ["restore", restoreMoves],
  ["reset", resetMoves],
]);

/** True when `git <sub> <args>` moves or discards work. */
const movesWork = ({ sub, args }: GitCall): boolean =>
  unknownSub(sub) || (MOVES_WORK.get(sub)?.(args) ?? false);

/**
 * The ask reason for a `Bash` command, or undefined when no git command in it moves or discards work.
 * `scripts` are the texts of the script files that the command runs (`scriptTexts`).
 */
export const gitReason = (
  command: string,
  scripts: Scripts = NO_SCRIPTS,
): string | undefined => {
  const { commands, code, fileCode, truncated } = withScripts(command, scripts);
  // Code in another language that names a git command gets the same ask, because the guard cannot tell whether the code runs it.
  for (const argv of [
    ...commands,
    ...[...code, ...fileCode].flatMap(codeCommands),
  ]) {
    if (hiddenName(argv)) return GIT_NAME_HIDDEN;
    const call = gitCall(argv);
    if (call && unknownSub(call.sub)) return GIT_SUB_HIDDEN;
    if (call && movesWork(call)) return GIT_MOVES_WORK({ sub: call.sub });
  }
  // The guard cannot read a command over the scan bound, so it asks.
  return truncated
    ? GIT_TOO_LONG({ scanMax: String(SHELL_SCAN_MAX_CHARS) })
    : undefined;
};
