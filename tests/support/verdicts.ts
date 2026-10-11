// Test helpers for the verdicts of the `reads` and `adherence` checks.
// The hooks module `hooks/register.ts` runs these checks, and no classic hook file runs them now.
// `decideRead` gives the `PreToolUse` deny of `printReason`, and `decideAsk` gives the `ask` of `askReason`.
// Each reader fails open on an unreadable file: it gives null, or `null` for a line count.
// An error that is not an unreadable code is thrown again, as the tests check.

import { FILE_MAX_BYTES } from "../../plugins/dotclaude/features/adherence/limits.ts";
import type { Io } from "../../plugins/dotclaude/features/adherence/rules.ts";
import { askReason } from "../../plugins/dotclaude/features/adherence/rules.ts";
import type { Payload } from "../../plugins/dotclaude/features/adherence/text.ts";
import { READ_MAX_BYTES } from "../../plugins/dotclaude/features/reads/limits.ts";
import type {
  Count,
  Payload as ReadPayload,
} from "../../plugins/dotclaude/features/reads/rules.ts";
import { printReason } from "../../plugins/dotclaude/features/reads/rules.ts";
import {
  rethrowUnless,
  UNREADABLE,
} from "../../plugins/dotclaude/lib/errors.ts";
import { preToolUse } from "../../plugins/dotclaude/lib/hook-io.ts";
import { lineCount } from "../../plugins/dotclaude/lib/text.ts";
import type { Env } from "./repo.ts";

/** The output of a `PreToolUse` hook: the `hookSpecificOutput` object. */
export type Verdict = ReturnType<typeof preToolUse>;

/** The text of `file` up to `max` bytes, or null when it is absent, larger than `max`, or unreadable. */
export async function readText(
  file: string,
  max: number = FILE_MAX_BYTES,
): Promise<string | null> {
  try {
    const bytes = Bun.file(file);
    if (bytes.size > max) return null;
    return await bytes.text();
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
}

/** The count of lines in `file`, null when it cannot be read, or `Infinity` when it is over `READ_MAX_BYTES`. */
export async function readLines(file: string): Promise<number | null> {
  try {
    const bytes = Bun.file(file);
    if (bytes.size > READ_MAX_BYTES) return Infinity;
    return lineCount(await bytes.text());
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
}

/** The `PreToolUse` deny for `payload`, or undefined. `count` gives the lines of a file. */
export async function decideRead(
  payload: ReadPayload | undefined,
  count: Count = readLines,
): Promise<Verdict | undefined> {
  // A payload with no `cwd` gets the process folder, as the print rule reads paths from it.
  const reason = await printReason({ cwd: process.cwd(), ...payload }, count);
  if (reason === null) return undefined;
  return preToolUse({
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  });
}

/** The `PreToolUse` ask for `payload`, or undefined. `io` replaces the reads in a test. */
export async function decideAsk(
  payload: Payload | undefined,
  env: Env = process.env,
  io: Partial<Io> = {},
): Promise<Verdict | undefined> {
  // A payload with no `cwd` gets the process folder, as the checks read paths from it.
  const call = { cwd: process.cwd(), ...payload };
  const root = env["CLAUDE_PROJECT_DIR"] || call.cwd || "";
  const reason = await askReason(call, {
    read: readText,
    root,
    home: env["HOME"],
    ...io,
  });
  if (reason === null) return undefined;
  return preToolUse({
    permissionDecision: "ask",
    permissionDecisionReason: reason,
  });
}
