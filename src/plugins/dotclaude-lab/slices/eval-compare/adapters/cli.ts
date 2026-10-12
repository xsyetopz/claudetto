// Runs `claude plugin eval` on two plugin folders, one after the other.
// The `dotclaude-eval-compare` bin calls `main`.
//
//   dotclaude-eval-compare A B [claude plugin eval options...]
//
// Each run scores a plugin arm against the same no-plugin baseline arm.
// So the `WITH` column of the two tables shows which plugin folder scores better.
// Each run costs money, so `--max-cost-usd 5` bounds each run when the options do not set it.
// The command adds no `--scaffold` and no `--allow-tools`.
// Each one runs the scripts or the tools of the suite as the user, so the user adds them for a trusted suite.
// The results of each run stay in `evals/results/` of its plugin folder.
// Exits 0 when both runs succeed.

import { runBoth } from "./run-both.ts";

const USAGE =
  "Usage: dotclaude-eval-compare A B [claude plugin eval options...]";

/** Runs the command with `argv`, and returns the exit code. */
export const main = (argv: string[]): number => {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  const [a, b, ...rest] = argv;
  if (!a || !b || a.startsWith("-") || b.startsWith("-")) {
    console.error(USAGE);
    return 2;
  }
  return runBoth(a, b, rest);
};
