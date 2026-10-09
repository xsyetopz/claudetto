// The classic `PreToolUse` hook of the `adherence` feature (design D34, tiers 1 and 2), for `Bash`, `Write`, `Edit`, and `MultiEdit`.
// It runs no model and reads the hook JSON from stdin.
// The checks are in `rules.mjs`: an ask before git commands that move work, an ask before a change of a test or a limits file,
// a deny for a code item with no code span in Markdown and in a commit message, a deny for an approval claim with no approval,
// and the deny and ask checks of the project rules file (`project.mjs`).
// It fails open: on any error, it prints nothing and the permission flow of Claude Code decides.

import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
} from "node:fs";
import path from "node:path";
import {
  FILE_MAX_BYTES,
  RULES_FILE_MAX_BYTES,
  TRANSCRIPT_MAX_BYTES,
} from "./limits.mjs";
import { parseRules, RULES_FILE } from "./project.mjs";
import { checkCall, verdict } from "./rules.mjs";

/** The text of `file` up to `max` bytes, or null when it is absent, larger than `max`, or unreadable. */
function readText(file, max = FILE_MAX_BYTES) {
  let fd;
  try {
    fd = openSync(file, "r");
    if (fstatSync(fd).size > max) return null;
    return readFileSync(fd, "utf8");
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** The end of the transcript `file`, as `{ text, truncated }`, or null when it cannot be read. */
function readTranscript(file) {
  let fd;
  try {
    fd = openSync(file, "r");
    const size = fstatSync(fd).size;
    const length = Math.min(size, TRANSCRIPT_MAX_BYTES);
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, size - length);
    return { text: buffer.toString("utf8"), truncated: size > length };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

/** The parsed project rules of the folder `root`, or null when the file is absent or invalid. */
export function loadRules(root, read = readText) {
  const text = root && read(path.join(root, RULES_FILE), RULES_FILE_MAX_BYTES);
  return typeof text === "string" ? parseRules(text) : null;
}

/** The `PreToolUse` output for `payload`, or undefined. `io` replaces the reads in a test. */
export function decide(payload, env = process.env, io = {}) {
  const root = env.CLAUDE_PROJECT_DIR || payload?.cwd || "";
  try {
    return verdict(
      checkCall(payload, {
        read: readText,
        transcript: readTranscript,
        rules: loadRules(root, io.read ?? readText),
        root,
        ...io,
      }),
    );
  } catch {
    return undefined;
  }
}

if (import.meta.main) {
  try {
    const out = decide(JSON.parse(readFileSync(0, "utf8")));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
