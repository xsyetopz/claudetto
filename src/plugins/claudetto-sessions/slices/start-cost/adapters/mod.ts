// The mod handler of the `start-cost` slice. It makes no model call, so `requests` is 0.
// `command.run` answers the typed command `/start-cost` by running the CLI `claudetto-start` and showing its output.
// When managed settings install the add-on, the answer starts with the account line from `$.session.identity()`.
// The handler catches each error, writes it to the debug log, and lets the session go on.
// The skill stays for a call of the model, and for arguments that need a shell.

import {
  failedText,
  outputOf,
  wordsOf,
} from "../../../../../kernel/skill-command.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { accountLine } from "../domain/account.ts";
import { TIMEOUT_MS } from "../limits.ts";

/** Runs `claudetto-start` with the words of the command and gives the output as the answer of the command. */
export const onStartCost: Handler<"command.run"> = async ($, e, next) => {
  try {
    const words = wordsOf(e.args);
    if (words === undefined) return next(e);
    const run = await $.process.run(
      [
        "bun",
        "--no-env-file",
        `${$.plugin.root}/bin/claudetto-start`,
        ...words,
      ],
      { timeoutMs: TIMEOUT_MS },
    );
    // A plugin install gets `{ deny }` here, and the report then names no account.
    const account = accountLine(await $.session.identity());
    const text = outputOf(run);
    return { text: account === undefined ? text : `${account}\n${text}` };
  } catch (error) {
    // The catch has no narrower test, because `$.process.run` documents no error type.
    $.ui.log(`claudetto-start: ${String(error)}`, { to: "debug" });
    return { text: failedText("claudetto-start", error) };
  }
};
