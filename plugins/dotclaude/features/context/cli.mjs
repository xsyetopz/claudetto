// The classic `PostToolUse` hook of dotclaude for subagents (design D22, probe 2.32).
// Inside a subagent the payload has `agent_id`, and `transcript_path` is the transcript of the main session.
// The transcript of the subagent is `<session>/subagents/agent-<agent_id>.jsonl`.
// The hook tells and does not block, because a block loses the work of the run.
// On each error it prints nothing.
// In the main session, on `UserPromptSubmit` only, the same entry gives the context note at a level (design D32).
// The note keeps no marker and writes no file, so it repeats at each prompt at or above a level (design D35).

import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
} from "node:fs";
import { contextLevel } from "./levels.mjs";
import { noteText } from "./notes.mjs";
import {
  boundFor,
  compactionOff,
  contextTokens,
  modelOf,
  reportNow,
} from "./rules.mjs";
import { allRows, countTurns, maxTurnsOf, turnFact } from "./turns.mjs";

/** The bytes at the end of the transcript that the hook reads, enough for the last request. */
const TAIL_BYTES = 262_144;

/** The path of the transcript of subagent `agentId` in the session of `transcriptPath`. */
export function subagentPath(transcriptPath, agentId) {
  return `${transcriptPath.replace(/\.jsonl$/, "")}/subagents/agent-${agentId}.jsonl`;
}

/** The parsed rows in the last `TAIL_BYTES` of `file`. The first line may be cut, so the parse skips it. */
export function tailRows(file) {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf8").split("\n");
    if (start > 0) lines.shift();
    const rows = [];
    for (const line of lines) {
      try {
        rows.push(JSON.parse(line));
      } catch {}
    }
    return rows;
  } finally {
    closeSync(fd);
  }
}

/**
 * The output for `payload`, or undefined.
 * One note covers the context bound and the turn bound (`maxTurns` of the agent file, counted in the whole transcript).
 * The options replace the reads and the agent folder in a test.
 */
export function decide(
  payload,
  read = tailRows,
  { readAll = allRows, agentsDir } = {},
) {
  if (!payload?.agent_id || !payload.transcript_path) return undefined;
  const file = subagentPath(payload.transcript_path, payload.agent_id);
  const rows = read(file);
  const max = maxTurnsOf(payload.agent_type, agentsDir);
  const fact = max ? turnFact(countTurns(readAll(file)), max) : undefined;
  return reportNow(contextTokens(rows), boundFor(modelOf(rows)), fact);
}

/**
 * The main-session output for `payload`, or undefined below `CONTEXT_NOTICE_AT`.
 * The context is the usage of the last request of the main session, which is the last row that is not a sidechain row.
 * The option replaces the read in a test.
 */
export function levelNote(
  payload,
  { read = tailRows, env = process.env } = {},
) {
  if (!payload?.transcript_path) return undefined;
  try {
    const rows = read(payload.transcript_path).filter((r) => !r?.isSidechain);
    const text = noteText(contextLevel(contextTokens(rows)), {
      off: compactionOff(env.DISABLE_COMPACT),
    });
    return text
      ? {
          hookSpecificOutput: {
            hookEventName: payload.hook_event_name,
            additionalContext: text,
          },
        }
      : undefined;
  } catch {
    return undefined;
  }
}

/** The output for `payload` of any event of this hook, or undefined. */
export function route(payload) {
  if (payload.agent_id) return decide(payload);
  return payload.hook_event_name === "UserPromptSubmit"
    ? levelNote(payload)
    : undefined;
}

if (import.meta.main) {
  try {
    const out = route(JSON.parse(readFileSync(0, "utf8")));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
