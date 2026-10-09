// The silent `sembr` hooks of dotclaude (design D29), two classic `PreToolUse` command hooks with one entry point.
// `PreToolUse` on `Write` and `Edit` of a `.md` or `.mdx` path puts each sentence on its own line through `updatedInput`.
// `PreToolUse` on `Bash` does the same for the text of a quoted heredoc (`<<'EOF'`) of `git commit -m` and `gh pr create --body`.
// It keeps the commit subject and the trailers, and does nothing for any other form.
// For `Edit` it changes `new_string` only, and only when `new_string` starts and ends at line bounds of the file.
// It prints no `additionalContext`, no `systemMessage`, and no `permissionDecision`, so the normal permission flow stays.
// The hook keeps no state and writes no file.
// On each error the hook prints nothing and the call goes on as written.

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  isMarkdown,
  rewriteCommand,
  rewriteContent,
  rewriteEdit,
} from "./rules.mjs";

/** The text of `file`, or null when it cannot be read. */
function readText(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

/** The `PreToolUse` output for `payload`, or undefined. `read` gives the text of a file. */
export function rewrite(payload, read = readText) {
  const input = payload?.tool_input;
  if (!input) return undefined;
  let updated;
  if (payload.tool_name === "Bash") {
    const command = rewriteCommand(input.command);
    if (command !== undefined) updated = { ...input, command };
  } else if (!isMarkdown(input.file_path)) return undefined;
  const file = path.resolve(payload.cwd ?? "", input.file_path ?? "");
  if (payload.tool_name === "Write") {
    const content = rewriteContent(input.content);
    if (content !== undefined) updated = { ...input, content };
  } else if (payload.tool_name === "Edit") {
    const next = rewriteEdit(input, read(file));
    if (next !== undefined) updated = { ...input, new_string: next };
  }
  if (!updated) return undefined;
  return {
    hookSpecificOutput: { hookEventName: "PreToolUse", updatedInput: updated },
  };
}

if (import.meta.main) {
  try {
    const out = rewrite(JSON.parse(readFileSync(0, "utf8")));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
