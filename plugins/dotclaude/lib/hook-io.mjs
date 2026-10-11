// The shared glue of the classic command hooks of dotclaude.
// Only a classic command hook imports this file, never `hooks/register.mjs`, because the hooks module runs with no Node.
// A hook gives `runHook` a decide function, and `runHook` reads the JSON payload from stdin and prints the output.
// A payload that is not JSON prints nothing, so the call goes on and the permission flow of Claude Code decides.
// Any other error also prints nothing on stdout, so the hook fails open, but it writes the error to stderr.
// The exit code stays 0, so a hook that crashes never blocks a call.
// Claude Code shows the stderr text of a hook that exits with code 0 only in its debug output.

import { readFileSync } from "node:fs";
import process from "node:process";
import { rethrowUnless } from "./errors.mjs";

/** The text that a hook writes to stderr for the unexpected error `err`. */
export const failureText = (err) =>
  `dotclaude hook failed: ${err?.stack ?? err}\n`;

/**
 * Reads the JSON payload, calls `decide`, and prints its output as JSON when it gives one.
 * The options `read`, `write`, and `fail` replace stdin, stdout, and stderr in a test.
 * A payload that does not parse prints nothing.
 * A reader or a `decide` that throws prints nothing on stdout and gives the error to `fail`.
 */
export function runHook(
  decide,
  {
    read = () => readFileSync(0, "utf8"),
    write = (text) => process.stdout.write(text),
    fail = (text) => process.stderr.write(text),
  } = {},
) {
  try {
    const payload = parse(read());
    if (payload === undefined) return;
    const out = decide(payload);
    if (out) write(JSON.stringify(out));
  } catch (err) {
    fail(failureText(err));
  }
}

/** The parsed JSON of `text`, or undefined for text that is not JSON. */
function parse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    rethrowUnless(err, "SyntaxError");
    return undefined;
  }
}

/**
 * The `hookSpecificOutput` object of a hook for `event` (`PreToolUse` or `PostToolUse`).
 * A field with no value is left out.
 */
export function hookOutput(event, fields) {
  const kept = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  return {
    hookSpecificOutput: { hookEventName: event, ...Object.fromEntries(kept) },
  };
}

/** The `PreToolUse` output with the given `permissionDecision`, `permissionDecisionReason`, `updatedInput`, and `additionalContext`. */
export const preToolUse = (fields) => hookOutput("PreToolUse", fields);

/** The `PostToolUse` output with the given `additionalContext`. */
export const postToolUse = (fields) => hookOutput("PostToolUse", fields);
