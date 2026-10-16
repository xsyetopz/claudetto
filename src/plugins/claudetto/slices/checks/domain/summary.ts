// The text that the CLI prints for each command, and the name of a log file.

import type { Failures } from "./failures.ts";

/** Why a command ended with no exit code: a signal, or the time bound. */
export type Stop =
  | { readonly kind: "signal"; readonly name: string }
  | { readonly kind: "timeout"; readonly afterMs: number };

/** The result of one command. */
export interface Outcome {
  readonly command: string;
  /** The exit code, or `null` when a signal or the time bound ended the command. */
  readonly exitCode: number | null;
  /** Why the command ended with no exit code, or `null` when it has one. */
  readonly stop: Stop | null;
  readonly ms: number;
  readonly failures: Failures | null;
  /** The output lines that the summary prints for a passing command, or `null` when the output is long or blank. */
  readonly shortOutput: readonly string[] | null;
  readonly logFile: string;
}

/** True when the command passed. */
export const passed = (o: Outcome): boolean => o.exitCode === 0;

/**
 * The name of the log file of command number `index` (from 1) in the run at `date`, with the random `run` id of the run.
 * The names sort in time order, and the id keeps two runs in one second apart.
 */
export const logName = (date: Date, run: string, index: number): string =>
  `${date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")}-${run}-${index}.log`;

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

const exitText = (o: Outcome): string => {
  if (o.exitCode !== null) return `exit ${o.exitCode}`;
  if (o.stop?.kind === "timeout")
    return `timed out after ${Math.round(o.stop.afterMs / 1000)}s`;
  if (o.stop?.kind === "signal") return `killed by ${o.stop.name}`;
  return "killed";
};

/** The lines to print for one command. */
export const renderOutcome = (o: Outcome): string[] => {
  const status = passed(o) ? "PASS" : "FAIL";
  const out = [
    `${status} $ ${o.command}`,
    `  ${exitText(o)} | ${seconds(o.ms)}`,
    `  log: ${o.logFile}`,
  ];
  if (o.failures && o.failures.lines.length > 0) {
    out.push("  last lines of the output:");
    if (o.failures.omitted > 0)
      out.push(`    ... ${o.failures.omitted} earlier lines in the log`);
    for (const line of o.failures.lines) out.push(`    ${line}`);
  }
  if (o.shortOutput) {
    out.push("  output:");
    for (const line of o.shortOutput) out.push(`    ${line}`);
  }
  return out;
};

/** The last line: the count of commands that passed. */
export const renderTotal = (outcomes: readonly Outcome[]): string =>
  `${outcomes.filter(passed).length} of ${outcomes.length} commands passed`;
