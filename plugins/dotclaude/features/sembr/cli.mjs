// The silent `sembr` hooks of dotclaude (design D29), two classic command hooks with one entry point.
// `PreToolUse` on `Write` and `Edit` of a `.md` or `.mdx` path puts each sentence on its own line through `updatedInput`.
// `PreToolUse` on `Bash` does the same for the text of a quoted heredoc (`<<'EOF'`) of `git commit -m` and `gh pr create --body`.
// It keeps the commit subject and the trailers, and does nothing for any other form.
// For `Edit` it changes `new_string` only, and only when `new_string` starts and ends at line bounds of the file.
// It prints no `additionalContext`, no `systemMessage`, and no `permissionDecision`, so the normal permission flow stays.
// `Stop` appends the counts of the chat lines with more than one sentence to a log for the eval, and prints nothing.
// On each error the hook prints nothing and the call goes on as written.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  chatCounts,
  isMarkdown,
  rewriteCommand,
  rewriteContent,
  rewriteEdit,
} from "./rules.mjs";

/** The log file of the chat counts: the data folder of the plugin, else the temp folder. */
export function logFile(env = process.env) {
  return path.join(env.CLAUDE_PLUGIN_DATA || tmpdir(), "sembr-chat.jsonl");
}

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

/** Append the counts of the last message of `payload` to the log. It prints nothing. */
export function count(payload, env = process.env, now = Date.now) {
  const message = payload?.last_assistant_message;
  if (typeof message !== "string") return;
  const file = logFile(env);
  mkdirSync(path.dirname(file), { recursive: true });
  const row = {
    ts: new Date(now()).toISOString(),
    session_id: payload.session_id ?? null,
    ...chatCounts(message),
  };
  appendFileSync(file, `${JSON.stringify(row)}\n`);
}

if (import.meta.main) {
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    if (payload.hook_event_name === "Stop") count(payload);
    else {
      const out = rewrite(payload);
      if (out) process.stdout.write(JSON.stringify(out));
    }
  } catch {}
}
