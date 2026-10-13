// The mod handler of the `usage` slice. It makes no model call, so `requests` is 0.
// `command.run` answers the typed command `/dotclaude-sessions:usage` by running the CLI `dotclaude-usage` and showing its output.
// The built-in `/usage` is another command, so the handler matches the name of the plugin too.
// The skill stays for a call of the model, and for arguments that need a shell.

import {
  failedText,
  outputOf,
  wordsOf,
} from "../../../../../kernel/skill-command.ts";
import type { Handler } from "../../../../../kernel/slice.ts";

/** The time that the CLI may take, in milliseconds. It reads each transcript of the period. */
const TIMEOUT_MS = 120_000;

/** Runs `dotclaude-usage` with the words of the command and gives the output as the answer of the command. */
export const onUsage: Handler<"command.run"> = async ($, e, next) => {
  const words = wordsOf(e.args);
  if (words === undefined) return next(e);
  try {
    const run = await $.process.run(
      [
        "bun",
        "--no-env-file",
        `${$.plugin.root}/bin/dotclaude-usage`,
        ...words,
      ],
      { timeoutMs: TIMEOUT_MS },
    );
    return { text: outputOf(run) };
  } catch (error) {
    // The catch has no narrower test, because `$.process.run` documents no error type.
    return { text: failedText("dotclaude-usage", error) };
  }
};
