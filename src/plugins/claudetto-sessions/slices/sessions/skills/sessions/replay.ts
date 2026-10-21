// Runs a hook module on each tool call that the transcripts of `~/.claude/projects/` record, with no model call, and counts what it denies.
//
//   bun replay.ts HOOK_MODULE [PROJECTS_DIR]
//
// The module exports `check(event, prior)`, sync or async.
// It can also export `checked(event)`, which tells if the filter of the hook takes the call, so that the output counts the events checked.
// `event` = `{ hook_event_name: "PreToolUse", tool_name, tool_input, tool_use_id, cwd, session_id, transcript_path }`.
// `prior` is the list of the transcript rows that come before the call, in the same file.
// A result is a deny when it has `deny`, `decision: "block"`, or `permissionDecision: "deny"`, also under `hookSpecificOutput`.
// The output is JSON: the calls, the events checked (only when the module exports `checked`), the denies, and each deny with its reason.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [module, dir = path.join(os.homedir(), ".claude", "projects")] =
  Bun.argv.slice(2);
const USAGE = "Usage: bun replay.ts HOOK_MODULE [PROJECTS_DIR]";
if (module === "--help") {
  console.log(USAGE);
  process.exit(0);
}
if (!module) {
  console.error(USAGE);
  process.exit(2);
}
if (!fs.existsSync(dir)) {
  console.error(`replay: no projects folder at ${dir}`);
  process.exit(1);
}
const { check, checked } = (await import(path.resolve(module))) as {
  check: (event: object, prior: object[]) => unknown;
  checked?: (event: object) => boolean;
};

interface Out {
  deny?: unknown;
  decision?: unknown;
  permissionDecision?: unknown;
  reason?: unknown;
  permissionDecisionReason?: unknown;
  hookSpecificOutput?: Out;
}
interface Row {
  type?: string;
  cwd?: string;
  sessionId?: string;
  message?: { content?: Block[] | string };
}
interface Block {
  type?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

/** The reason when `out` denies, `""` when it denies with no reason, and `null` when it allows. */
const denial = (out: unknown): string | null => {
  const top = (out ?? {}) as Out;
  for (const o of [top, top.hookSpecificOutput ?? {}]) {
    if (o.deny) return String(o.deny);
    if (o.decision === "block" || o.permissionDecision === "deny")
      return String(o.reason ?? o.permissionDecisionReason ?? "");
  }
  return null;
};

let calls = 0;
let events = 0;
let denies = 0;
const shown: { file: string; tool: string; reason: string }[] = [];
for (const rel of new Bun.Glob("**/*.jsonl").scanSync({ cwd: dir })) {
  const file = path.join(dir, rel);
  const prior: Row[] = [];
  for (const line of (await Bun.file(file).text()).split("\n")) {
    let row: Row;
    try {
      row = JSON.parse(line) as Row;
    } catch {
      continue;
    }
    prior.push(row);
    const content = row.message?.content;
    if (row.type !== "assistant" || !Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      calls++;
      const event = {
        hook_event_name: "PreToolUse",
        tool_name: block.name,
        tool_input: block.input,
        cwd: row.cwd,
        session_id: row.sessionId,
        tool_use_id: block.id,
        transcript_path: file,
      };
      if (checked?.(event)) events++;
      const reason = denial(await check(event, prior.slice(0, -1)));
      if (reason === null) continue;
      denies++;
      shown.push({ file, tool: String(block.name), reason });
    }
  }
}
console.log(
  JSON.stringify(
    { calls, ...(checked ? { checked: events } : {}), denies, shown },
    null,
    2,
  ),
);
