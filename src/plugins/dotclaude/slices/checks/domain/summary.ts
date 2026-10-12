// The text that the CLI prints for each command, and the name of a log file.

import type { Counts } from "./counts.ts";
import type { Failures } from "./failures.ts";

/** The result of one command. */
export interface Outcome {
  readonly command: string;
  /** The exit code, or `null` when a signal or the time bound ended the command. */
  readonly exitCode: number | null;
  readonly ms: number;
  readonly counts: Counts | null;
  readonly failures: Failures | null;
  readonly logFile: string;
}

/** True when the command passed. */
export const passed = (o: Outcome): boolean => o.exitCode === 0;

/** The name of the log file of command number `index` (from 1) in the run at `date`. The names sort in time order. */
export const logName = (date: Date, index: number): string =>
  `${date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "Z")}-${index}.log`;

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

/** The lines to print for one command. */
export const renderOutcome = (o: Outcome): string[] => {
  const status = passed(o) ? "PASS" : "FAIL";
  const exit = o.exitCode === null ? "killed" : `exit ${o.exitCode}`;
  const counts = o.counts
    ? ` | ${o.counts.passed} passed, ${o.counts.failed} failed, ${o.counts.skipped} skipped`
    : "";
  const out = [
    `${status} $ ${o.command}`,
    `  ${exit} | ${seconds(o.ms)}${counts}`,
    `  log: ${o.logFile}`,
  ];
  if (o.failures) {
    out.push("  failures:");
    for (const line of o.failures.lines) out.push(`    ${line}`);
    if (o.failures.omitted > 0)
      out.push(`    ... ${o.failures.omitted} more lines in the log`);
  }
  return out;
};

/** The last line: the count of commands that passed. */
export const renderTotal = (outcomes: readonly Outcome[]): string =>
  `${outcomes.filter(passed).length} of ${outcomes.length} commands passed`;
