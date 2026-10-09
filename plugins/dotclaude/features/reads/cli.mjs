// The classic `PreToolUse` hook of dotclaude on `Bash` with two deny rules.
// A command which only prints a file gets the `Read` call with the same file and range (design D22).
// A command whose output has no bound gets the bounded form of the command (`bounds.mjs`, task 18.14).
// A deny is cheap here, because the next call does the same read with a bound and no work is lost.
// On each error the hook prints nothing and the call goes on.

import { readFileSync } from "node:fs";
import path from "node:path";
import { boundReason } from "./advice.mjs";
import { unbounded } from "./bounds.mjs";
import { denyReason, generated, printOf, words } from "./rules.mjs";

/** The count of lines in `file`, or null when it cannot be read. */
function lineCount(file) {
  try {
    const text = readFileSync(file, "utf8");
    return text === ""
      ? 0
      : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  } catch {
    return null;
  }
}

/** The `PreToolUse` output for `payload`, or undefined. `count` gives the lines of a file. */
export function decide(payload, count = lineCount) {
  if (payload?.tool_name !== "Bash") return undefined;
  const command = payload.tool_input?.command ?? "";
  const argv = words(command);
  const print = argv && printOf(argv);
  if (print) {
    const file = path.resolve(payload.cwd ?? "", print.file);
    // A generated file has no useful `Read` range, so the bound rule below decides it.
    if (!generated(file)) return printDeny(print, file, count);
  }
  const name = unbounded(command);
  return name ? deny(boundReason(name)) : undefined;
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

const deny = (reason) => ({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  },
});

if (import.meta.main) {
  try {
    const out = decide(JSON.parse(readFileSync(0, "utf8")));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
