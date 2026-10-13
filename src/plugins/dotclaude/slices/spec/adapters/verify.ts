// `dotclaude-spec verify <package> [--in <dir>] [--json]`: runs the `verify` command of the package and records the result.
// The command runs with `sh -c` in `<dir>` (default: the root), at the head of the branch of `<dir>`.
// The event goes to the main checkout. Exit status 0 gives `verified`. Any other status keeps the package in `doing`.

import path from "node:path";
import { gateVerify, verifyTarget } from "../domain/gates.ts";
import { hasTransition, PACKAGE_TRANSITIONS } from "../domain/states.ts";
import { parseArgs } from "./args.ts";
import { head, shell } from "./git.ts";
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
  const sha = head(dir);
  const gate = gateVerify({
    command: file.verify,
    exit: 0,
    sha,
    head: head(dir),
  });
  if (!gate.ok) return stop(run, gate.reason);
  const result = shell(dir, file.verify);
  const moved = await movePackage(run, id, pkg, verifyTarget(result.code), {
    sha,
    verify: { command: file.verify, exit: result.code },
  });
  printMoved(run, "verify", moved, parsed.json);
  if (result.code !== 0 && !parsed.json)
    for (const line of result.out.split("\n").slice(-TAIL_LINES))
      run.io.error(line);
  return result.code === 0 ? 0 : 1;
};
