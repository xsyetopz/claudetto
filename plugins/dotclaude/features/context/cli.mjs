// The classic `PostToolUse` hook of dotclaude for subagents (design D22, probe 2.32).
// Inside a subagent the payload has `agent_id`, and `transcript_path` is the transcript of the main session.
// The transcript of the subagent is `<session>/subagents/agent-<agent_id>.jsonl`.
// The hook tells and does not block, because a block loses the work of the run.
// On each error it prints nothing.
// In the main session, on `UserPromptSubmit` and `PostToolUse`, the same entry gives one note
// when the context or a usage window first reaches a level in the session (design D32).
// The `PostToolUse` route is necessary because one long turn can pass a level with no new prompt.
// `SessionEnd`, `StopFailure`, and `SessionStart` carry a handoff across `/clear` and record a hard stop (`carry.mjs`).

import {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
} from "node:fs";
import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import { accountOf, readUsage } from "../../lib/usage-state.mjs";
import { recordStop, saveHandoff, startNote } from "./carry.mjs";
import { levelsOf, newLevels } from "./levels.mjs";
import { claimLevel, HANDOFF_MARK, handedOff } from "./marker.mjs";
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
 * The main-session output for `payload`, or undefined below the levels and for a level that fired.
 * The context is the usage of the last request of the main session, which is the last row that is not a sidechain row.
 * The usage windows come from the file of the status line. With no file, only the context levels apply.
 * The options replace the reads and the marker claim in a test.
 */
export function levelNote(
  payload,
  {
    read = tailRows,
    env = process.env,
    now = Date.now() / 1000,
    usage = readUsage(accountOf(env), now),
    claim = claimLevel,
  } = {},
) {
  if (!payload?.transcript_path) return undefined;
  try {
    const rows = read(payload.transcript_path).filter((r) => !r?.isSidechain);
    const tokens = contextTokens(rows);
    const levels = levelsOf(tokens, usage, now);
    if (!levels.length) return undefined;
    const session = payload.session_id || payload.transcript_path;
    const done = new Set(
      levels.filter((l) => !claim(session, l.id)).map((l) => l.id),
    );
    const fresh = newLevels(levels, done);
    if (!fresh.length) return undefined;
    if (fresh.some((l) => l.step === "handoff")) claim(session, HANDOFF_MARK);
    return {
      hookSpecificOutput: {
        hookEventName: payload.hook_event_name,
        additionalContext: noteText(fresh, {
          share: (tokens / CONTEXT_WINDOW) * 100,
          off: compactionOff(env.DISABLE_COMPACT),
          now,
        }),
      },
    };
  } catch {
    return undefined;
  }
}

/** The output for `payload` of any event of this hook, or undefined. `dir` is `${CLAUDE_PLUGIN_DATA}`. */
export function route(payload, { dir = process.env.CLAUDE_PLUGIN_DATA } = {}) {
  switch (payload.hook_event_name) {
    case "SessionEnd":
      saveHandoff(payload, { dir, read: tailRows, handedOff });
      return undefined;
    case "StopFailure":
      recordStop(payload, { dir, now: Date.now() / 1000 });
      return undefined;
    case "SessionStart":
      return startNote(payload, { dir });
    default:
      return payload.agent_id ? decide(payload) : levelNote(payload);
  }
}

if (import.meta.main) {
  try {
    const out = route(JSON.parse(readFileSync(0, "utf8")));
    if (out) process.stdout.write(JSON.stringify(out));
  } catch {}
}
