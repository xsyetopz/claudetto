// `dotclaude-spec review <package> approve|reject [--finding <text>]... [--json]`: the verdict of a review.
// The package must be in `review`.
// `approve` adds a verdict event and keeps the lane `review`, and `merge` then takes the package.
// `reject` needs one finding or more, and moves the package to `doing` with the findings.
// Only the main checkout records a verdict, as only the main checkout changes a lane.

import {
  type Lane,
  VERDICTS,
  type Verdict,
} from "../../../../../kernel/spec-store.ts";
import { parseArgs } from "./args.ts";
import { applyMove, printMove, refusedInWorktree } from "./lane.ts";
import type { Run } from "./run.ts";

const USAGE = `Usage: dotclaude-spec review <package> <${VERDICTS.join("|")}> [--finding <text>]... [--json]`;

const isVerdict = (value: string): value is Verdict =>
  (VERDICTS as readonly string[]).includes(value);

export const reviewCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const parsed = parseArgs(args, { lists: ["finding"] });
  if (typeof parsed === "string") {
    run.io.error(parsed);
    return 2;
  }
  const [pkg, verdict, extra] = parsed.words;
  if (!pkg || !verdict || !isVerdict(verdict) || extra !== undefined) {
    run.io.error(USAGE);
    return 2;
  }
  const findings = parsed.lists["finding"] ?? [];
  if (verdict === "reject" && findings.length === 0) {
    run.io.error(
      "A `reject` needs the defects. Run it again with one `--finding <text>` for each defect.",
    );
    return 2;
  }
  if (refusedInWorktree(run, "records a verdict")) return 1;
  const lane: Lane = verdict === "approve" ? "review" : "doing";
  const move = await applyMove(
    run,
    pkg,
    lane,
    { verdict, ...(findings.length > 0 ? { findings } : {}) },
    (before) =>
      before === "review"
        ? null
        : `The lane of \`${pkg}\` is \`${before}\`. Only a package in \`review\` gets a verdict.`,
  );
  if (move === null) return 1;
  printMove(run, move, parsed.json);
  return 0;
};
