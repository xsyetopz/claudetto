// The two `claude plugin eval` runs of `bin/dotclaude-eval-compare`.

import path from "node:path";
import {
  runProgram,
  type Spawn,
  spawnSyncOrNull,
} from "../../lib/run-program.ts";

/** The eval options with the cost bound added when the caller sets none. */
export function withCostBound(opts: string[]): string[] {
  return opts.some((o) => /^--max-cost-usd(?:=|$)/.test(o))
    ? opts
    : [...opts, "--max-cost-usd", "5"];
}

/**
 * Runs the eval on one plugin folder. Returns the exit code of `claude`.
 * It adds no `--scaffold` and no `--allow-tools`, because each one runs the code or the tools of the suite as the user.
 * The user adds them in the options for a suite that the user trusts.
 */
function evalOf(
  plugin: string,
  opts: string[],
  spawn: Spawn,
  log: (line: string) => void,
): number {
  try {
    return (
      runProgram(
        "claude",
        ["plugin", "eval", plugin, "--no-publish", ...opts],
        { stdio: "inherit" },
        spawn,
      )?.exitCode ?? 1
    );
  } catch (err) {
    // A word that a Windows shell cannot take safely: say why, and count the run as failed.
    log((err as Error).message);
    return 1;
  }
}

/**
 * Runs the eval on `a`, then on `b`. Returns 0 when both succeed, else 1.
 * `spawn` and `log` are the process runner and the output, which a test replaces with fakes.
 */
export function runBoth(
  a: string,
  b: string,
  rest: string[],
  spawn: Spawn = spawnSyncOrNull,
  log: (line: string) => void = console.log,
): number {
  const opts = withCostBound(rest);
  const first = path.resolve(a);
  const second = path.resolve(b);
  log(`\n== Arm A (${first})\n`);
  const x = evalOf(first, opts, spawn, log);
  log(`\n== Arm B (${second})\n`);
  const y = evalOf(second, opts, spawn, log);
  if (x === 0 && y === 0) {
    log("\nCompare the WITH column of the two tables.");
    return 0;
  }
  const arms: [string, number][] = [
    ["A", x],
    ["B", y],
  ];
  const failed = arms
    .filter(([, code]) => code !== 0)
    .map(([name, code]) => `Arm ${name} failed with exit code ${code}.`);
  log(`\n${failed.join("\n")}\nTell the user, and do not compare the tables.`);
  return 1;
}
