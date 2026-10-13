// The CLI `dotclaude-run-checks` of the `checks` slice. The launcher `bin/dotclaude-run-checks` calls `main`.
//
//   dotclaude-run-checks "bun test" "bun run lint"
//
// Each argument is one command. The commands run in order, in the folder where the CLI runs.
// A command of plain words runs with no shell. A command with shell syntax (a pipe, a list, a quote, a glob, `$`) runs through `sh -c`.
// For each command the CLI prints the exit status, the time, the counts of passed, failed, and skipped tests when the output shows them,
// and the failure lines of a failed command. The output of a passing command is printed when it is short, at most `MAX_PASS_OUTPUT_LINES` lines.
// The full output goes to a log file in `CHECKS_DIR`, and the summary names the file.
// Exit status: 0 when all commands pass, 1 when any command fails, 2 for a usage error.
// An argument that starts with `-` is a flag, so the CLI exits 2 before it runs any command.

import fs from "node:fs/promises";
import path from "node:path";
import { processRunner } from "../../../../../kernel/node/process.ts";
import { CHECKS_DIR } from "../../../../../kernel/paths.ts";
import type {
  Clock,
  Env,
  ProcessResult,
  ProcessRunner,
} from "../../../../../kernel/ports.ts";
import { flagArg, plainArgv, shellArgv } from "../domain/command.ts";
import { parseCounts } from "../domain/counts.ts";
import { failureLines } from "../domain/failures.ts";
import { passOutput } from "../domain/output.ts";
import {
  logName,
  type Outcome,
  passed,
  renderOutcome,
  renderTotal,
  type Stop,
} from "../domain/summary.ts";
import { COMMAND_TIMEOUT_MS, RUN_ID_LENGTH } from "../limits.ts";

const USAGE = 'Usage: dotclaude-run-checks "<command>" ["<command>" ...]';

/** The ports of the CLI. A test gives fakes. */
export interface Deps {
  readonly runner: ProcessRunner;
  readonly clock: Clock;
  readonly env: Env;
  readonly writeLog: (file: string, text: string) => Promise<void>;
  readonly log: (line: string) => void;
  readonly error: (line: string) => void;
  readonly windows: boolean;
}

const defaults = (): Deps => ({
  runner: processRunner,
  clock: { now: () => Date.now() },
  env: { get: (name) => process.env[name] },
  writeLog: async (file, text) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await Bun.write(file, text);
  },
  log: (line) => console.log(line),
  error: (line) => console.error(line),
  windows: process.platform === "win32",
});

/** Why a run ended with no exit code: the time bound, or else the signal that ended it. */
const stopOf = (r: ProcessResult): Stop | null => {
  if (r.timedOut) return { kind: "timeout", afterMs: COMMAND_TIMEOUT_MS };
  if (r.signal) return { kind: "signal", name: r.signal };
  return null;
};

/** Run `command` and give its exit code, its output, and why it stopped with no exit code. A program that is missing gives 127 and the error text. */
const execute = (
  command: string,
  cwd: string,
  deps: Deps,
): { exitCode: number | null; output: string; stop: Stop | null } => {
  const argv = plainArgv(command) ?? shellArgv(command, deps.windows);
  try {
    const r = deps.runner.run(argv.file, argv.args, {
      cwd,
      timeout: COMMAND_TIMEOUT_MS,
    });
    return {
      exitCode: r.exitCode,
      output: r.stdout + r.stderr,
      stop: stopOf(r),
    };
  } catch (err) {
    return {
      exitCode: 127,
      output: `Cannot run ${argv.file}: ${err instanceof Error ? err.message : String(err)}\n`,
      stop: null,
    };
  }
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  cwd: string = process.cwd(),
  deps: Deps = defaults(),
): Promise<number> => {
  if (args.length === 0 || args.some((a) => a.trim() === "")) {
    deps.error(USAGE);
    return 2;
  }
  const commands = args;
  const flag = flagArg(commands);
  if (flag !== undefined) {
    deps.error(
      `"${flag}" is a flag, not a command. Quote each whole command, such as: dotclaude-run-checks "bun --version"`,
    );
    return 2;
  }
  const start = new Date(deps.clock.now());
  const runId = crypto.randomUUID().slice(0, RUN_ID_LENGTH);
  const root = path.resolve(deps.env.get("CLAUDE_PROJECT_DIR") || cwd);
  const outcomes: Outcome[] = [];
  for (const [i, command] of commands.entries()) {
    const began = deps.clock.now();
    const { exitCode, output, stop } = execute(command, cwd, deps);
    const ms = deps.clock.now() - began;
    const logFile = path.posix.join(CHECKS_DIR, logName(start, runId, i + 1));
    await deps.writeLog(
      path.join(root, logFile),
      `$ ${command}\nexit: ${exitCode ?? "killed"}\n\n${output}`,
    );
    const outcome: Outcome = {
      command,
      exitCode,
      stop,
      ms,
      counts: parseCounts(output),
      failures: exitCode === 0 ? null : failureLines(output),
      shortOutput: exitCode === 0 ? passOutput(output) : null,
      logFile,
    };
    outcomes.push(outcome);
    for (const line of renderOutcome(outcome)) deps.log(line);
  }
  deps.log(renderTotal(outcomes));
  return outcomes.every(passed) ? 0 : 1;
};
