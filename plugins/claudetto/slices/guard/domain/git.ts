// The `git` rules (D4): a local command that can lose work that no ref keeps, and a push that rewrites remote history.
// A push with a delete refspec such as `origin :branch` counts as `push --delete`.

import { baseName, stripWrappers } from "../../../kernel/wrappers.ts";

/** Which files of the paths count: tracked changes, untracked files, or each file that `git` has no commit of. */
export type GitScope = "changes" | "untracked" | "delete";

type GitCall = { dir: string | undefined; verb: string; args: string[] };

/** What a local `git` command can lose: the files of `paths` in `scope` (each file when `paths` is empty), or `"always"`. */
export type Loss = { scope: GitScope; paths: string[] } | "always";

const GIT_VALUE_OPTS = new Set(
  "-C -c --git-dir --work-tree --namespace --exec-path --super-prefix --config-env".split(
    " ",
  ),
);
const PUSH_VALUE_OPTS = new Set(
  "--repo --receive-pack --exec --push-option -o".split(" "),
);

export const gitCall = (argv: string[]): GitCall | null => {
  const rest = stripWrappers(argv);
  if (baseName(rest[0] ?? "") !== "git") return null;
  let dir: string | undefined;
  let i = 1;
  while ((rest[i] ?? "").startsWith("-")) {
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

const changes = (paths: string[] = []): Loss => ({ scope: "changes", paths });
const opts = (s: string) => new Set(s.split(" "));

const LOSSES: Record<string, (args: string[]) => Loss | null> = {
  reset: (args) => (args.includes("--hard") ? changes() : null),
  checkout: (args) => {
    // A branch name is a path with no change, so `git` gives it as clean.
    const paths = operands(args);
    if (hasFlag(args, "--force", "f")) return changes();
    return paths.length ? changes(paths) : null;
  },
  restore: (args) =>
    hasFlag(args, "--staged", "S") && !hasFlag(args, "--worktree", "W")
      ? null
      : changes(operands(args, opts("-s --source --pathspec-from-file"))),
  clean: (args) =>
    !hasFlag(args, "--force", "f") || hasFlag(args, "--dry-run", "n")
      ? null
      : {
          scope:
            hasFlag(args, "-x", "x") || hasFlag(args, "-X", "X")
              ? "delete"
              : "untracked",
          paths: operands(args, opts("-e --exclude")),
        },
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

/** True when `args` has `--all` or a short option cluster with `a` before a letter that takes a value (`mFcCtSu`), such as `-a` and `-am`. */
const commitsAll = (args: string[]): boolean => {
  for (const arg of args) {
    if (arg === "--") return false;
    if (arg === "--all") return true;
    if (!/^-[A-Za-z]/.test(arg)) continue;
    for (const letter of arg.slice(1)) {
      if (letter === "a") return true;
      if ("mFcCtSu".includes(letter)) break;
    }
  }
  return false;
};

/** True for `git add -A`, `git add --all`, `git add .`, and `git commit -a`, which stage each change of the work tree. */
export const bulkStage = (call: GitCall): boolean =>
  call.verb === "add"
    ? hasFlag(call.args, "--all", "A") ||
      operands(call.args).some((a) => a === "." || a === "./")
    : call.verb === "commit" && commitsAll(call.args);

export const remoteRewrite = ({ verb, args }: GitCall): boolean => {
  if (verb !== "push") return false;
  const plain = operands(args, PUSH_VALUE_OPTS);
  const repo = args.some((a) => a === "--repo" || a.startsWith("--repo="));
  return (
    args.some((a) =>
      /^--(?:force|force-with-lease|delete|mirror)(?:=|$)/.test(a),
    ) ||
    hasFlag(args, "--force", "f") ||
    hasFlag(args, "--delete", "d") ||
    (repo ? plain : plain.slice(1)).some((r) => /^[+:]/.test(r))
  );
};
