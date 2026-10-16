// The mod handlers of the `usage` slice. They make no model call, so `requests` is 0.
// `session.start` adds the plugin version of the session to the version record in `$.store`.
// `command.run` answers the typed command `/claudetto-sessions:usage` by running the CLI `claudetto-usage` and showing its output.
// The built-in `/usage` is another command, so the handler matches the name of the plugin too.
// When managed settings install the add-on, the answer starts with the account line from `$.session.identity()`.
// It gives the CLI the version record, so the report counts the sessions by plugin version.
// Each handler catches its error, writes it to the debug log, and lets the session go on.
// The skill stays for a call of the model, and for arguments that need a shell.

import {
  failedText,
  outputOf,
  wordsOf,
} from "../../../../../kernel/skill-command.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { accountLine } from "../domain/account.ts";
import { manifestVersion, recordOf, withSession } from "../domain/versions.ts";
import { TIMEOUT_MS, VERSION_RECORD_MAX } from "../limits.ts";

/** The key of the version record in `$.store`. */
const RECORD = "pluginVersions";

/** The `session.start` hook: the session goes into the version record with the version of the manifest. */
export const onSessionStart: Handler<"session.start"> = async ($, e, next) => {
  try {
    const version = manifestVersion(
      await $.fs.read(`${$.plugin.root}/.claude-plugin/plugin.json`),
    );
    const record = recordOf(await $.store.get(RECORD));
    await $.store.set(
      RECORD,
      withSession(record, await $.session.id(), version, VERSION_RECORD_MAX),
    );
  } catch (error) {
    // The catch has no narrower test, because `$.fs.read` and `$.store` document no error type.
    $.ui.log(`claudetto-usage: ${String(error)}`, { to: "debug" });
  }
  return next(e);
};

/** The `--plugin-versions` argument of the CLI, or no argument when `$.store` fails, so that the report runs without the record. */
const recordArgs = async (
  $: Parameters<Handler<"command.run">>[0],
): Promise<string[]> => {
  try {
    return [
      "--plugin-versions",
      JSON.stringify(recordOf(await $.store.get(RECORD))),
    ];
  } catch (error) {
    // The catch has no narrower test, because `$.store` documents no error type.
    $.ui.log(`claudetto-usage: ${String(error)}`, { to: "debug" });
    return [];
  }
};

/** Runs `claudetto-usage` with the words of the command and gives the output as the answer of the command. */
export const onUsage: Handler<"command.run"> = async ($, e, next) => {
  try {
    const words = wordsOf(e.args);
    if (words === undefined) return next(e);
    const run = await $.process.run(
      [
        "bun",
        "--no-env-file",
        `${$.plugin.root}/bin/claudetto-usage`,
        ...words,
        ...(await recordArgs($)),
      ],
      { timeoutMs: TIMEOUT_MS },
    );
    // A plugin install gets `{ deny }` here, and the report then names no account.
    const account = accountLine(await $.session.identity());
    const text = outputOf(run);
    return { text: account === undefined ? text : `${account}\n${text}` };
  } catch (error) {
    // The catch has no narrower test, because `$.process.run` documents no error type.
    $.ui.log(`claudetto-usage: ${String(error)}`, { to: "debug" });
    return { text: failedText("claudetto-usage", error) };
  }
};
