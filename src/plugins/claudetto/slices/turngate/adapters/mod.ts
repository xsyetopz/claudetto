// The mod handlers of the `turngate` slice.
//
// `tool.call` keeps a summary line of each call, for each agent: the main loop, and each subagent by its `agentId`.
// `classic.Stop` and `classic.SubagentStop` run the gate:
// a background task that still runs blocks the stop with no model call,
// and else, when the turn has a reply and the `judge` option is on, one `$.model.complete` call judges the reply.
// For the main loop, the judge also gets the last prompt of the user from `prompt.submit` and the reply of the stop before it.
// The gate keeps its own count of blocks in each turn, and gives no pass for `stop_hook_active` (D58).
// A stop that the gate allows ends the turn, so it clears the record of the agent. A turn that the user interrupts clears it too.
// The cost comes from the `usage` of the judge result, because the session total leaves out a model call of a hook (D63).
// `tool.check` denies a `Bash` command that starts a job that Claude Code does not track, or that stops processes by a pattern (`domain/jobs.ts`).
//
// `claude plugin validate` follows `$` only into a function of one file.
// For this reason, each function that touches `$` is here, and the rules are in `domain/`.

import type { EngineInterface, PluginOptions } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { type CallLine, callLine } from "../domain/calls.ts";
import { jobsReason } from "../domain/jobs.ts";
import {
  type Context,
  judgeReason,
  judgeRequest,
  parseVerdict,
} from "../domain/judge.ts";
import {
  runningTasks,
  type TaskSummary,
  tasksReason,
} from "../domain/tasks.ts";
import {
  JUDGE_EFFORT,
  JUDGE_MAX_TOKENS,
  JUDGE_MODEL,
  JUDGE_TIMEOUT_MS,
  MAX_AGENTS,
  MAX_BLOCKS,
} from "../limits.ts";
import { NOTICE_CAP, NOTICE_FAILED, NOTICE_USAGE } from "../prompts.ts";

/** The record of one agent in the current turn. */
interface Turn {
  calls: CallLine[];
  blocks: number;
}

/** The record of each agent, by `agentId`, with `""` for the main loop. */
const turns = new Map<string, Turn>();

/** The last prompt of the user, and the reply of the last stop that the gate allowed, for the main loop. */
const main: { request: string; earlier: string } = { request: "", earlier: "" };

/** The `judge` option, which the generated `register` sets once with `keepOptions`. It is on by default. */
const kept: { judge: boolean } = { judge: true };

/** Keeps the `judge` option from the `userConfig` values of the plugin. */
export const keepOptions = (options: PluginOptions): void => {
  kept.judge = options["judge"] !== false;
};

const turnOf = (key: string): Turn => {
  const found = turns.get(key);
  if (found) return found;
  if (turns.size >= MAX_AGENTS) {
    const oldest = turns.keys().next().value;
    if (oldest !== undefined) turns.delete(oldest);
  }
  const turn: Turn = { calls: [], blocks: 0 };
  turns.set(key, turn);
  return turn;
};

export const onToolCall: Handler<"tool.call"> = async (_$, e, next) => {
  const out = await next(e);
  const { tool, tool_use_id: _id, agentId, ...input } = e;
  turnOf(agentId ?? "").calls.push(callLine(tool, input, out));
  return out;
};

export const onCheck: Handler<"tool.check"> = async (_$, e, next) => {
  const verdict = await next(e);
  if (verdict?.decision === "deny") return verdict;
  const reason = jobsReason((e.input as { command?: unknown }).command);
  return reason === undefined ? verdict : { decision: "deny", reason };
};

export const onSubmit: Handler<"prompt.submit"> = async (_$, e, next) => {
  const out = await next(e);
  // The filter of `slice.ts` passes only a prompt that the user wrote.
  if (out.drop === undefined) main.request = e.text;
  return out;
};

export const onTurnAborted: Handler<"turn.complete"> = async (_$, e, next) => {
  turns.delete(e.agentId ?? "");
  return next(e);
};

/** One judge call. Gives the block reason, or `undefined` when the reply has no fault or the judge gives no verdict. */
const judge = async (
  $: EngineInterface,
  reply: string,
  calls: readonly CallLine[],
  context: Context,
): Promise<string | undefined> => {
  const request = judgeRequest(reply, calls, context);
  let r: Awaited<ReturnType<EngineInterface["model"]["complete"]>>;
  try {
    r = await $.model.complete({
      model: JUDGE_MODEL,
      ...request,
      maxTokens: JUDGE_MAX_TOKENS,
      effort: JUDGE_EFFORT,
      timeoutMs: JUDGE_TIMEOUT_MS,
    });
  } catch (err) {
    $.ui.log(NOTICE_FAILED({ cause: String(err) }));
    return undefined;
  }
  const verdict = r.isAnswered ? parseVerdict(r.text) : undefined;
  $.ui.log(
    NOTICE_USAGE({
      model: JUDGE_MODEL,
      input: String(r.usage.input_tokens),
      cacheRead: String(r.usage.cache_read_input_tokens),
      cacheWrite: String(r.usage.cache_creation_input_tokens),
      output: String(r.usage.output_tokens),
      verdict: verdict?.fault ?? "none given",
    }),
    { to: "debug" },
  );
  if (!r.isAnswered) {
    const cause =
      r.reason === "aborted"
        ? `timeout after ${JUDGE_TIMEOUT_MS} ms`
        : r.reason;
    $.ui.log(NOTICE_FAILED({ cause }));
    return undefined;
  }
  if (verdict === undefined) {
    $.ui.log(
      NOTICE_FAILED({ cause: "the reply of the judge is not a verdict" }),
    );
    return undefined;
  }
  return verdict.fault === "none" ? undefined : judgeReason(verdict);
};

/** The fields of a `Stop` or a `SubagentStop` input that the gate reads. */
interface StopFields {
  readonly last_assistant_message?: string;
  readonly background_tasks?: readonly TaskSummary[];
}

/** The block reason of the gate for the turn of `key`, or `undefined` to allow the stop. It counts the block. */
const gate = async (
  $: EngineInterface,
  key: string,
  e: StopFields,
): Promise<string | undefined> => {
  const turn = turnOf(key);
  const tasks = runningTasks(e.background_tasks);
  const reply = e.last_assistant_message ?? "";
  const reason =
    tasks.length > 0
      ? tasksReason(tasks)
      : kept.judge && reply.trim() !== ""
        ? await judge(
            $,
            reply,
            turn.calls,
            key === "" ? main : { request: "", earlier: "" },
          )
        : undefined;
  if (reason !== undefined && turn.blocks < MAX_BLOCKS) {
    turn.blocks += 1;
    return reason;
  }
  if (reason !== undefined) $.ui.log(NOTICE_CAP({ reason }));
  if (key === "") main.earlier = reply;
  turns.delete(key);
  return undefined;
};

export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
  const result = await next(e);
  // A block of a hook beneath stands, and the gate does not judge or count it.
  if (result.block !== undefined) return result;
  const block = await gate($, "", e);
  return block === undefined ? result : { ...result, block };
};

export const onSubagentStop: Handler<"classic.SubagentStop"> = async (
  $,
  e,
  next,
) => {
  const result = await next(e);
  if (result.block !== undefined) return result;
  const block = await gate($, e.agent_id, e);
  return block === undefined ? result : { ...result, block };
};
