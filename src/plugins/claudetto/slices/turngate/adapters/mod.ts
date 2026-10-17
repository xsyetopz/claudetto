// The mod handlers of the `turngate` slice.
//
// `tool.call` keeps a summary line of each call, for each agent: the main loop, and each subagent by its `agentId`.
// `classic.Stop` and `classic.SubagentStop` run the gate:
// when the turn has a reply and the `judge` option is on, one `$.model.complete` call judges the reply,
// and a background task that still runs gives one notice and no block (D32).
// For the main loop, the judge also gets the last prompt of the user from `prompt.submit` and the reply of the stop before it.
// The judge gives no pass for `stop_hook_active` (D58), and the 8-continuation cap of Claude Code bounds its blocks.
// A stop that the gate allows ends the turn, so it clears the record of the agent. A turn that the user interrupts clears it too.
// The cost comes from the `usage` of the judge result, because the session total leaves out a model call of a hook (D63).
// `tool.check` denies a `Bash` command that starts a job that Claude Code does not track, or that stops processes by a pattern (`domain/jobs.ts`).
//
// `claude plugin validate` follows `$` only into a function of one file.
// For this reason, each function that touches `$` is here, and the rules are in `domain/`.

import type { EngineInterface, PluginOptions } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { oneLine } from "../../../../../kernel/text.ts";
import { type CallLine, callLine } from "../domain/calls.ts";
import { commandFaults, jobsReason } from "../domain/jobs.ts";
import {
  type Context,
  judgeReason,
  judgeRequest,
  parseVerdict,
} from "../domain/judge.ts";
import {
  runningTasks,
  type TaskSummary,
  tasksNotice,
} from "../domain/tasks.ts";
import {
  JUDGE_EFFORT,
  JUDGE_MAX_TOKENS,
  JUDGE_MODEL,
  JUDGE_TIMEOUT_MS,
  MAX_AGENTS,
} from "../limits.ts";
import { NOTICE_FAILED, NOTICE_USAGE } from "../prompts.ts";

/** The record of one agent in the current turn. */
interface Turn {
  calls: CallLine[];
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
  const turn: Turn = { calls: [] };
  turns.set(key, turn);
  return turn;
};

export const onToolCall: Handler<"tool.call"> = async (_$, e, next) => {
  const out = await next(e);
  const { tool, tool_use_id: _id, agentId, ...input } = e;
  turnOf(agentId ?? "").calls.push(callLine(tool, input, out));
  return out;
};

export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const verdict = await next(e);
  if (verdict?.decision === "deny") return verdict;
  const faults = commandFaults((e.input as { command?: unknown }).command);
  if (faults.length === 0) return verdict;
  const tools = await $.tool.list().catch(() => []);
  const hasTaskStop = tools.some((t) => t.name === "TaskStop");
  return { decision: "deny", reason: jobsReason(faults, hasTaskStop) };
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
    $.ui.log(oneLine(NOTICE_FAILED({ cause: String(err) })));
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
    $.ui.log(oneLine(NOTICE_FAILED({ cause })));
    return undefined;
  }
  if (verdict === undefined) {
    $.ui.log(
      oneLine(
        NOTICE_FAILED({ cause: "the reply of the judge is not a verdict" }),
      ),
    );
    return undefined;
  }
  return verdict.fault === "none" ? undefined : judgeReason(verdict);
};

/** The fields of a `Stop` or a `SubagentStop` input that the gate reads. */
interface StopFields {
  readonly stop_hook_active?: boolean;
  readonly last_assistant_message?: string;
  readonly background_tasks?: readonly TaskSummary[];
}

/** What the gate adds to the result of a stop: a block reason, or a notice that continues the turn. */
type Outcome = { block?: string; notice?: string };

/**
 * The gate for the turn of `key`.
 * The judge blocks a claim at each stop, also on a retry with `stop_hook_active`, because a pass there let a false claim through (D58).
 * Running tasks give one notice, and none when the stop already continues for a hook (D32).
 * A stop with no block and no notice ends the turn, so it clears the record of the agent.
 */
const gate = async (
  $: EngineInterface,
  key: string,
  e: StopFields,
): Promise<Outcome> => {
  const turn = turnOf(key);
  const reply = e.last_assistant_message ?? "";
  const block =
    kept.judge && reply.trim() !== ""
      ? await judge(
          $,
          reply,
          turn.calls,
          key === "" ? main : { request: "", earlier: "" },
        )
      : undefined;
  if (block !== undefined) return { block };
  const tasks = runningTasks(e.background_tasks);
  const notice =
    e.stop_hook_active === true ? undefined : tasksNotice(tasks, reply);
  if (notice !== undefined) return { notice };
  if (key === "") main.earlier = reply;
  turns.delete(key);
  return {};
};

/** `result` with the outcome of the gate. A notice goes to the model as `additionalContext`, which has no error label. */
const withOutcome = <R extends { additionalContext?: string[] }>(
  result: R,
  o: Outcome,
): R =>
  o.block !== undefined
    ? { ...result, block: o.block }
    : o.notice !== undefined
      ? {
          ...result,
          additionalContext: [...(result.additionalContext ?? []), o.notice],
        }
      : result;

export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
  const result = await next(e);
  // A block of a hook beneath stands, and the gate does not judge it.
  if (result.block !== undefined) return result;
  return withOutcome(result, await gate($, "", e));
};

export const onSubagentStop: Handler<"classic.SubagentStop"> = async (
  $,
  e,
  next,
) => {
  const result = await next(e);
  if (result.block !== undefined) return result;
  return withOutcome(result, await gate($, e.agent_id, e));
};
