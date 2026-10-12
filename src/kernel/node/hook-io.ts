// The shared glue of the classic command hooks of dotclaude.
// Only a classic command hook imports this file, never `hooks/register.ts`, because the hooks module runs with no Node.
// A hook gives `runHook` a decide function, and `runHook` reads the JSON payload from stdin and prints the output.
// A payload that is not JSON prints nothing, so the call goes on and the permission flow of Claude Code decides.
// Any other error also prints nothing on stdout, so the hook fails open, but it writes the error to stderr.
// The exit code stays 0, so a hook that crashes never blocks a call.
// Claude Code shows the stderr text of a hook that exits with code 0 only in its debug output.

import { rethrowUnless } from "../errors.ts";
import { readStdin } from "./stdin.ts";

/** The fields of a `hookSpecificOutput` object. A field with the value `undefined` is left out of the output. */
export type OutputFields = {
  permissionDecision?: "allow" | "deny" | "ask" | undefined;
  permissionDecisionReason?: string | undefined;
  updatedInput?: Record<string, unknown> | undefined;
  additionalContext?: string | undefined;
};

/** A hook output: the event name and each field that has a value. */
export type HookOutput = {
  hookSpecificOutput: { hookEventName: string } & {
    [K in keyof OutputFields]?: Exclude<OutputFields[K], undefined>;
  };
};

/** The replaceable stdin, stdout, and stderr of `runHook`. */
type HookIO = {
  read?: () => string | Promise<string>;
  write?: (text: string) => unknown;
  fail?: (text: string) => unknown;
};

/** The text that a hook writes to stderr for the unexpected error `err`. */
export const failureText = (err: unknown): string =>
  `dotclaude hook failed: ${(err as Error | null | undefined)?.stack ?? err}\n`;

/** The parsed JSON of `text`, or undefined for text that is not JSON. */
const parse = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (err) {
    rethrowUnless(err, "SyntaxError");
    return undefined;
  }
};

/**
 * Reads the JSON payload, calls `decide`, and prints its output as JSON when it gives one.
 * The options `read`, `write`, and `fail` replace stdin, stdout, and stderr in a test.
 * A payload that does not parse prints nothing.
 * A reader or a `decide` that throws prints nothing on stdout and gives the error to `fail`.
 */
export const runHook = async (
  decide: (payload: unknown) => unknown | Promise<unknown>,
  {
    read = readStdin,
    write = (text: string) => process.stdout.write(text),
    fail = (text: string) => process.stderr.write(text),
  }: HookIO = {},
): Promise<void> => {
  try {
    const payload = parse(await read());
    if (payload === undefined) return;
    const out = await decide(payload);
    if (out) write(JSON.stringify(out));
  } catch (err) {
    fail(failureText(err));
  }
};

/**
 * The `hookSpecificOutput` object of a hook for `event` (`PreToolUse` or `PostToolUse`).
 * A field with no value is left out.
 */
export const hookOutput = (event: string, fields: OutputFields): HookOutput => {
  const kept = Object.entries(fields).filter(
    ([, value]) => value !== undefined,
  );
  return {
    hookSpecificOutput: { hookEventName: event, ...Object.fromEntries(kept) },
  };
};

/** The `PreToolUse` output with the given `permissionDecision`, `permissionDecisionReason`, `updatedInput`, and `additionalContext`. */
export const preToolUse = (fields: OutputFields): HookOutput =>
  hookOutput("PreToolUse", fields);

/** The `PostToolUse` output with the given `additionalContext`. */
export const postToolUse = (fields: OutputFields): HookOutput =>
  hookOutput("PostToolUse", fields);
