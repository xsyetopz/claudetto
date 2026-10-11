// The classic `PostToolUse` hook of dotclaude for subagents (design D22, probe 2.32).
// Inside a subagent the payload has `agent_id`, and `transcript_path` is the transcript of the main session.
// The transcript of the subagent is `<session>/subagents/agent-<agent_id>.jsonl`.
// The hook tells and does not block, because a block loses the work of the run.
// On each error it prints nothing.
// The main session gets no note, because compaction is off and the output style covers it.

import { runHook } from "../../lib/hook-io.mjs";
import { readTail } from "../../lib/tail.mjs";
import { boundFor, contextTokens, modelOf, reportNow } from "./rules.mjs";
import {
  allRows,
  countTurns,
  maxTurnsOf,
  parseRows,
  turnFact,
} from "./turns.mjs";

/** The bytes at the end of the transcript that the hook reads, enough for the last request. */
const TAIL_BYTES = 262_144;

/** The path of the transcript of subagent `agentId` in the session of `transcriptPath`. */
export function subagentPath(transcriptPath, agentId) {
  return `${transcriptPath.replace(/\.jsonl$/, "")}/subagents/agent-${agentId}.jsonl`;
}

/** The parsed rows in the last `TAIL_BYTES` of `file`. The first line may be cut, so the parse skips it. */
export function tailRows(file) {
  const tail = readTail(file, TAIL_BYTES);
  if (!tail) return [];
  const lines = tail.text.split("\n");
  if (tail.truncated) lines.shift();
  return parseRows(lines);
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

/** The output for `payload` of any event of this hook, or undefined. The main session gets none. */
export function route(payload) {
  return payload.agent_id ? decide(payload) : undefined;
}

if (import.meta.main) runHook(route);
