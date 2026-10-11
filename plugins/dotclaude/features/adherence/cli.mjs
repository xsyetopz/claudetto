// The classic `PreToolUse` hook of the `adherence` feature (design D34, tier 1), for `Bash`, `Write`, `Edit`, and `MultiEdit`.
// It runs no model and reads the hook JSON from stdin.
// The checks are in `rules.mjs`: an ask before git commands that move work, an ask before a change of a test or a limits file,
// a deny for a code item with no code span in Markdown and in a commit message, and a deny for an approval claim with no approval.
// It fails open: on any error, it prints nothing and the permission flow of Claude Code decides.
// An error that is not an absent file is written to stderr by `runHook`.

import { closeSync, fstatSync, openSync, readFileSync } from "node:fs";
import { rethrowUnless, UNREADABLE } from "../../lib/errors.mjs";
import { runHook } from "../../lib/hook-io.mjs";
import { readTail } from "../../lib/tail.mjs";
import { FILE_MAX_BYTES, TRANSCRIPT_MAX_BYTES } from "./limits.mjs";
import { checkCall, verdict } from "./rules.mjs";

/** The text of `file` up to `max` bytes, or null when it is absent, larger than `max`, or unreadable. */
export function readText(file, max = FILE_MAX_BYTES) {
  let fd;
  try {
    fd = openSync(file, "r");
    if (fstatSync(fd).size > max) return null;
    return readFileSync(fd, "utf8");
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** The end of the transcript `file`, as `{ text, truncated }`, or null when it cannot be read. */
export const readTranscript = (file) => readTail(file, TRANSCRIPT_MAX_BYTES);

/** The `PreToolUse` output for `payload`, or undefined. `io` replaces the reads in a test. */
export function decide(payload, env = process.env, io = {}) {
  const root = env.CLAUDE_PROJECT_DIR || payload?.cwd || "";
  return verdict(
    checkCall(payload, {
      read: readText,
      transcript: readTranscript,
      root,
      home: env.HOME,
      ...io,
    }),
  );
}

if (import.meta.main) runHook((payload) => decide(payload));
