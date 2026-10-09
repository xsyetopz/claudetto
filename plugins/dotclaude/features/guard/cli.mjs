// The classic `PreToolUse` hook of dotclaude, for auto mode only.
// In auto mode, the classifier decides an ask of the `tool.check` guard in `hooks/register.mjs`,
// and it can approve the call with no prompt (measured on Claude Code 2.1.292).
// An ask of a classic hook "can't approve the call silently" in auto mode (hooks docs),
// so this script gives the stateless asks of `hooks/register.mjs` from a classic hook in that mode.
// It keeps no state between calls.
// In each other mode it exits at once, because `hooks/register.mjs` covers the call in-process.
//
// The `if` filters in `hooks.json` start this script only for the commands that the rules can match.
// It fails open: on an error, it prints nothing, and the permission flow of Claude Code decides.

import { readFileSync } from "node:fs";
import { rmAsk } from "./rules.mjs";

/**
 * The `PreToolUse` output for `payload`, or undefined.
 * This hook keeps no state, so it gives only the stateless rules (the `rm` ask).
 */
export function decide(payload, env) {
  if (payload?.permission_mode !== "auto") return undefined;
  const reason = rmAsk(payload.tool_name, payload.tool_input, {
    cwd: payload.cwd,
    root: env.CLAUDE_PROJECT_DIR || payload.cwd,
    home: env.HOME,
    tmp: env.TMPDIR,
  });
  if (!reason) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  };
}

if (import.meta.main) {
  try {
    const out = decide(JSON.parse(readFileSync(0, "utf8")), process.env);
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
