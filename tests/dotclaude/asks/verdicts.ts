// Test helper for the verdicts of the `asks` checks.
// `decideAsk` gives the ask of `askReason` in the shape `{ hookSpecificOutput: { permissionDecision, permissionDecisionReason } }`.
// The reader fails open on an unreadable file: it gives null.

import type { Io } from "../../../plugins/dotclaude/slices/asks/domain/check.ts";
import { askReason } from "../../../plugins/dotclaude/slices/asks/domain/check.ts";
import type { Payload } from "../../../plugins/dotclaude/slices/asks/domain/text.ts";
import { FILE_MAX_BYTES } from "../../../plugins/dotclaude/slices/asks/limits.ts";
import type { Env } from "../../support/repo.ts";

/** The `PreToolUse` output of an ask. */
export type Verdict = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "ask";
    permissionDecisionReason: string;
  };
};

/** The `code` values of a file that is absent or not a readable file. */
const UNREADABLE = ["ENOENT", "ENOTDIR", "EISDIR", "EACCES"];

/** The text of `file` up to `max` bytes, or `null` when it is absent, larger than `max`, or unreadable. */
export const readText = async (
  file: string,
  max: number = FILE_MAX_BYTES,
): Promise<string | null> => {
  try {
    const bytes = Bun.file(file);
    if (bytes.size > max) return null;
    return await bytes.text();
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (typeof code === "string" && UNREADABLE.includes(code)) return null;
    throw err;
  }
};

/** The `PreToolUse` ask for `payload`, or undefined. `io` replaces the reads in a test. */
export const decideAsk = async (
  payload: Payload | undefined,
  env: Env = process.env,
  io: Partial<Io> = {},
): Promise<Verdict | undefined> => {
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
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  };
};
