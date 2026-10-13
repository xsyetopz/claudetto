// `dotclaude-spec verify <package> [--in <dir>] [--json]`: runs the `verify` command of the package and records the result.
// The command runs with `sh -c` in `<dir>` (default: the root), at the head of the branch of `<dir>`.
// `<dir>` must be a worktree of this repository.
// The head is read once before the command. A head that moved, or a change outside `.dotclaude/spec/`, fails the verify with a reason.
// The event goes to the main checkout. Exit status 0 gives `verified`. Any other status keeps the package in `doing`.

import path from "node:path";
import { SPEC_DIR } from "../../../../../kernel/paths.ts";
import { gateVerify, verifyTarget } from "../domain/gates.ts";
import { hasTransition, PACKAGE_TRANSITIONS } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { exec, gitPath, head, shell } from "./git.ts";
import type { Run } from "./run.ts";
import {
  movePackage,
  printMoved,
  stop,
  targetOf,
  usage,
} from "./transition.ts";

const USAGE = "Usage: dotclaude-spec verify <package> [--in <dir>] [--json]";

/** The most lines of the output of a failed command that `verify` prints. */
const TAIL_LINES = 40;

/** The files of the work tree of `dir` that differ from `HEAD` or are new, outside the spec folder. */
const strayFiles = (dir: string): string[] => {
  const status = exec(dir, "git", [
    "status",
    "--porcelain",
    "-z",
    "--untracked-files=all",
    "--",
    ":/",
    `:(exclude,top)${SPEC_DIR}`,
  ]);
  return status.stdout
    .split("\0")
    .filter((t) => t !== "")
    .map((t) => t.slice(3));
};

export const verifyCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { values: ["in"] });
  if (typeof parsed === "string") return usage(run, parsed);
  const [pkg, extra] = parsed.words;
  if (!pkg || extra !== undefined) return usage(run, USAGE);
  const target = await targetOf(run, pkg, "records a verify");
  if (target === null) return 1;
  const { id, state, file } = target;
  const step = { from: state, command: "verify", to: "verified" } as const;
  if (!hasTransition(PACKAGE_TRANSITIONS, step))
    return stop(
      run,
      `The package \`${pkg}\` is \`${state}\`, and only a package in \`doing\` is verified.`,
    );
  if (!file)
    return stop(
      run,
      `The package \`${pkg}\` has no file to read the \`verify\` command from.`,
    );
  const dir = path.resolve(run.store.root, parsed.values["in"] ?? ".");
  const common = gitPath(dir, "--git-common-dir");
  if (common === null || common !== gitPath(run.store.root, "--git-common-dir"))
    return stop(
      run,
      `The folder \`${dir}\` is not a worktree of this repository.`,
    );
  const sha = head(dir);
  const before = gateVerify({
    command: file.verify,
    exit: 0,
    sha,
    head: sha,
  });
  if (!before.ok) return stop(run, before.reason);
  const result = shell(dir, file.verify);
  const after = gateVerify({
    command: file.verify,
    exit: result.code,
    sha,
    head: head(dir),
  });
  const stray = strayFiles(dir);
  const reason = !after.ok
    ? `The head of \`${dir}\` changed during the command.`
    : stray.length > 0
      ? `The command left changes outside \`${SPEC_DIR}\`: ${stray.join(", ")}.`
      : undefined;
  const exit = result.code === 0 && reason !== undefined ? 1 : result.code;
  const moved = await movePackage(run, id, pkg, verifyTarget(exit), {
    sha,
    verify: { command: file.verify, exit },
    ...(reason === undefined ? {} : { note: reason }),
  });
  printMoved(run, "verify", moved, parsed.json);
  if (exit !== 0 && !parsed.json) {
    if (reason !== undefined) run.io.error(reason);
    for (const line of result.out.split("\n").slice(-TAIL_LINES))
      run.io.error(line);
  }
  return exit === 0 ? 0 : 1;
};
