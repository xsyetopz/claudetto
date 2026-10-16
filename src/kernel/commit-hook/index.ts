// The `commit-msg` hook of git that checks the attribution line of a commit that Claude Code makes.
// `/claudetto:setup` puts the script in the `env` of the settings as a config-based hook of git 2.54 or later (`hook.<name>.event` and `hook.<name>.command`).
// An older git ignores these keys, so the check then passes with no output.
// The `attribution` slice writes the lines that the script accepts, one file for each model, in `ATTRIBUTION_DIR` of the home folder.
// A hooks module imports this file, so it has no `node:` import, no `bun:` import, and no `Bun`.

import { NOTE, SCRIPT } from "./prompts.ts";

/** The folder under the home folder where the hook finds the lines of a session, in the folder `<session id>`. */
export const ATTRIBUTION_DIR = ".claudetto/attribution";

/** The name of the hook in the git config, which must not be the name of a git event. */
export const HOOK_NAME = "claudetto-attribution";

/** The marker that stands for the lines in the note, until the script text gets its shell variable. */
const MARK = "\u0000";

/**
 * The script of the hook, as one shell command: a function `f` that git calls with the message file as `$1`.
 * Git appends its arguments to the text of the command, so the text ends with the call `f`.
 * The note sits in a heredoc, so each `` ` `` and `$` of the note is escaped, except the `$LINES` that lists the accepted lines.
 */
export const hookScript = (): string => {
  const note = NOTE({ lines: MARK }).replace(/[\\`$]/g, "\\$&");
  return SCRIPT({ note: note.replace(MARK, "$LINES") });
};
