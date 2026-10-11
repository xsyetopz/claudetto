// The classic `PreToolUse` hook of dotclaude on `Bash` with one deny rule.
// A command which only prints a file gets the `Read` call with the same file and range (design D22).
// A deny is cheap here, because the next call does the same read with a bound and no work is lost.
// On each error the hook prints nothing and the call goes on.
// An error that is not an absent file is written to stderr by `runHook`.

import { readFileSync } from "node:fs";
import path from "node:path";
import { rethrowUnless, UNREADABLE } from "../../lib/errors.mjs";
import { preToolUse, runHook } from "../../lib/hook-io.mjs";
import { lineCount } from "../../lib/text.mjs";
import { denyReason, generated, printOf, words } from "./rules.mjs";

/** The count of lines in `file`, or null when it cannot be read. */
function fileLines(file) {
  try {
    return lineCount(readFileSync(file, "utf8"));
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return null;
  }
}

/** The `PreToolUse` output for `payload`, or undefined. `count` gives the lines of a file. */
export function decide(payload, count = fileLines) {
  if (payload?.tool_name !== "Bash") return undefined;
  const command = payload.tool_input?.command ?? "";
  const argv = words(command);
  const print = argv && printOf(argv);
  if (print) {
    const file = path.resolve(payload.cwd ?? "", print.file);
    // A generated file has no useful `Read` range, so the command stays allowed.
    if (!generated(file)) return printDeny(print, file, count);
  }
  return undefined;
}

/** The deny of a file print, or undefined for a file that does not exist or has no lines. */
function printDeny(print, file, count) {
  let { offset, limit } = print;
  if (print.tail !== undefined) {
    const total = count(file);
    if (total === null || total === 0) return undefined;
    offset = Math.max(1, total - print.tail + 1);
    limit = total - offset + 1;
  } else if (count(file) === null) return undefined;
  return deny(denyReason({ offset, limit }, file));
}

const deny = (reason) =>
  preToolUse({
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  });

if (import.meta.main) runHook((payload) => decide(payload));
