// The `git` rules of the permission gate (spec `permission-gate`, D4 of change `0-3-0`):
// a local command that can lose work that no ref or reflog keeps, and a push that rewrites or deletes remote history.
// A push with a delete refspec such as `origin :branch` counts as `push --delete`.
// The functions are pure, and `gate.ts` asks `git` for the state of the paths.

import { baseName, stripWrappers } from "../../../kernel/wrappers.ts";

/** Which files of the paths count: tracked changes, untracked files, or each file that `git` has no commit of. */
export type GitScope = "changes" | "untracked" | "delete";

type GitCall = { dir: string | undefined; verb: string; args: string[] };

/** What a local `git` command can lose: the files of `paths` in `scope` (each file when `paths` is empty), or `"always"`. */
export type Loss = { scope: GitScope; paths: string[] } | "always";

const GIT_VALUE_OPTS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--super-prefix",
  "--config-env",
]);

const PUSH_VALUE_OPTS = new Set([
  "--repo",
  "--receive-pack",
  "--exec",
  "--push-option",
  "-o",
]);

export const gitCall = (argv: string[]): GitCall | null => {
  const rest = stripWrappers(argv);
  if (rest[0] === undefined || baseName(rest[0]) !== "git") return null;
  let dir: string | undefined;
  let i = 1;
  while (i < rest.length && (rest[i] as string).startsWith("-")) {
    if (rest[i] === "-C") dir = rest[i + 1];
    i += GIT_VALUE_OPTS.has(rest[i] as string) ? 2 : 1;
  }
  const verb = rest[i];
  return verb === undefined ? null : { dir, verb, args: rest.slice(i + 1) };
};

/** The words of `args` that are not options, with each word after `--`, and with the value of each option in `valueOpts` left out. */
const operands = (args: string[], valueOpts = new Set<string>()): string[] => {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === "--") return [...out, ...args.slice(i + 1)];
    if (!arg.startsWith("-")) out.push(arg);
    else if (valueOpts.has(arg)) i++;
  }
  return out;
};

/** True when `args` has the long option `long`, or a short option cluster with the letter `short`. */
const hasFlag = (args: string[], long: string, short: string): boolean =>
  args.some(
    (a) => a === long || (/^-[A-Za-z]+$/.test(a) && a.slice(1).includes(short)),
  );

const restoreLoss = (args: string[]): Loss | null => {
  const staged = hasFlag(args, "--staged", "S");
  if (staged && !hasFlag(args, "--worktree", "W")) return null;
  return {
    scope: "changes",
    paths: operands(args, new Set(["-s", "--source", "--pathspec-from-file"])),
  };
};

const cleanLoss = (args: string[]): Loss | null => {
  if (!hasFlag(args, "--force", "f") || hasFlag(args, "--dry-run", "n"))
    return null;
  const ignored = hasFlag(args, "-x", "x") || hasFlag(args, "-X", "X");
  return {
    scope: ignored ? "delete" : "untracked",
    paths: operands(args, new Set(["-e", "--exclude"])),
  };
};

const checkoutLoss = (args: string[]): Loss | null => {
  if (hasFlag(args, "--force", "f")) return { scope: "changes", paths: [] };
  // A branch name is a path with no change, so `git` gives it as clean.
  const paths = operands(args);
  return paths.length ? { scope: "changes", paths } : null;
};

const LOSSES: Record<string, (args: string[]) => Loss | null> = {
  reset: (args) =>
    args.includes("--hard") ? { scope: "changes", paths: [] } : null,
  checkout: checkoutLoss,
  restore: restoreLoss,
  clean: cleanLoss,
  stash: (args) =>
    args[0] === "drop" || args[0] === "clear" ? "always" : null,
  reflog: (args) => (args[0] === "expire" ? "always" : null),
  gc: (args) =>
    args.some((a) => /^--prune=(?:now|all)$/.test(a)) ? "always" : null,
};

/** What the local `git` call `call` can lose, or `null` when it keeps each byte. */
export const localLoss = (call: GitCall): Loss | null =>
  Object.hasOwn(LOSSES, call.verb)
    ? (LOSSES[call.verb] as (args: string[]) => Loss | null)(call.args)
    : null;

/** The refspecs of the `git push` arguments `args`: each plain word after the remote, or each plain word when `--repo` names the remote. */
const refspecs = (args: string[]): string[] => {
  const plain = operands(args, PUSH_VALUE_OPTS);
  const repo = args.some((a) => a === "--repo" || a.startsWith("--repo="));
  return repo ? plain : plain.slice(1);
};

export const remoteRewrite = (call: GitCall): boolean => {
  if (call.verb !== "push") return false;
  const { args } = call;
  const forced =
    args.some((a) =>
      /^--(?:force|force-with-lease|delete|mirror)(?:=|$)/.test(a),
    ) ||
    hasFlag(args, "--force", "f") ||
    hasFlag(args, "--delete", "d");
  return forced || refspecs(args).some((r) => /^[+:]/.test(r));
};
