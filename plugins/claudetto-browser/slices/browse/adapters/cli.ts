// The command `claudetto-browser-guide`: it prints the `agent-browser` guide for the `browse` skill.
// It runs `agent-browser skills get core` and cuts the output at the bound of `limits.ts`.

import { GUIDE_COMMAND, type GuideRun, guideText } from "../guide.ts";
import { GUIDE_TIMEOUT_MS } from "../limits.ts";

/** Runs `cmd` with `args` and gives a `GuideRun`. A missing program gives `ENOENT`, and a timeout gives `ETIMEDOUT`. */
const runGuide = (cmd: string, args: string[]): GuideRun => {
  try {
    const run = Bun.spawnSync({
      cmd: [cmd, ...args],
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: GUIDE_TIMEOUT_MS,
    });
    if (run.exitedDueToTimeout)
      return {
        status: null,
        error: { code: "ETIMEDOUT", message: "timed out" },
      };
    return { status: run.exitCode, stdout: run.stdout.toString() };
  } catch (error) {
    // A spawn failure is an `Error` with a `code` such as `ENOENT`. Any other thrown value keeps its text.
    if (!(error instanceof Error))
      return { status: null, error: { message: String(error) } };
    const code = (error as NodeJS.ErrnoException).code;
    return {
      status: null,
      error:
        code === undefined
          ? { message: error.message }
          : { code, message: error.message },
    };
  }
};

/** Prints the guide. Returns the exit code, which is 0 also when `agent-browser` gives no guide, because the text then tells Claude what to do. */
export const main = (_argv: readonly string[]): number => {
  const [cmd, ...args] = GUIDE_COMMAND;
  console.log(guideText(runGuide(cmd, args)));
  return 0;
};
