// The mod handlers of the `notice` slice: the start of a turn, and the check of the first call of a turn that changes something.
// Each `$` call is in this file, because `$` is not followed across an import.
// The check fails open: a failed or slow model call shows no notice, and the verdict of the call never changes.

import type { EngineInterface, ModelForkResult } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import {
  actionOf,
  completePrompt,
  forkPrompt,
  isChange,
  isRepeat,
  SYSTEM,
  topicOf,
} from "../domain/notice.ts";
import {
  COMPLETE_MODEL,
  COMPLETE_TIMEOUT_MS,
  FORK_WAIT_MS,
  MAX_REPLY_TOKENS,
  TOAST_MS,
} from "../limits.ts";

/** The session values that `types/index.d.ts` declares. */
const TURN = { plugin: "dcc-plugin-you-should-know", key: "turn" } as const;
const PATH = { plugin: "dcc-plugin-you-should-know", key: "path" } as const;
const SHOWN = { plugin: "dcc-plugin-you-should-know", key: "shown" } as const;

/** The HTTP status that a subscription gets for a separate call from a hook when `CLAUDE_CODE_ATTRIBUTION_HEADER` is `0`. */
const TOO_MANY_REQUESTS = 429;

/** The `turn.start` hook: a new turn is not checked yet. A turn with no typed prompt keeps the prompt of the turn before it. */
export const onTurnStart: Handler<"turn.start"> = async ($, e, next) => {
  const out = await next(e);
  const { value: last } = await $.state.get(TURN);
  await $.state.set(TURN, {
    id: e.turnId,
    prompt: e.text || (last?.prompt ?? ""),
    checked: false,
  });
  return out;
};

/** The answer of a fork, or none when the fork takes longer than `FORK_WAIT_MS`. */
const forkAnswer = async (
  $: EngineInterface,
  prompt: string,
): Promise<string | undefined> => {
  const late = $.clock.sleep(FORK_WAIT_MS).then(() => undefined);
  const reply: ModelForkResult | undefined = await Promise.race([
    $.model.fork({ prompt }),
    late,
  ]);
  return reply?.isAnswered ? reply.text : undefined;
};

/**
 * The answer of the model for the pending action.
 * It tries the separate call first, and after an HTTP 429 it uses a fork for this check and for the rest of the session.
 */
const answerFor = async (
  $: EngineInterface,
  request: string,
  action: string,
  shown: readonly string[],
): Promise<string | undefined> => {
  const { value: path = "complete" } = await $.state.get(PATH);
  if (path === "complete") {
    const reply = await $.model.complete({
      model: COMPLETE_MODEL,
      system: SYSTEM,
      prompt: completePrompt(request, action, shown),
      maxTokens: MAX_REPLY_TOKENS,
      timeoutMs: COMPLETE_TIMEOUT_MS,
    });
    if (reply.isAnswered) return reply.text;
    if (reply.reason !== "api-error" || reply.status !== TOO_MANY_REQUESTS)
      return undefined;
    await $.state.set(PATH, "fork");
  }
  return forkAnswer($, forkPrompt(action, shown));
};

/** Shows the topic of the pending action, if the model gives one that did not show in this session. */
const notify = async (
  $: EngineInterface,
  request: string,
  action: string,
): Promise<void> => {
  const { value: shown = [] } = await $.state.get(SHOWN);
  const answer = await answerFor($, request, action, shown);
  const topic = answer === undefined ? undefined : topicOf(answer);
  if (topic === undefined || isRepeat(topic, shown)) return;
  await $.state.set(SHOWN, [...shown, topic]);
  $.ui.toast(topic, { timeoutMs: TOAST_MS });
};

/**
 * The `tool.check` hook: the first call of a turn that changes something gets one check, and the call runs as the verdict says.
 * A query, a call of a subagent, a denied call, and a read get no check.
 */
export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const out = await next(e);
  if (e.tool_use_id === undefined || e.agentId !== undefined) return out;
  if (out.decision === "deny" || !isChange(e.tool, e.input)) return out;
  try {
    const { value: turn } = await $.state.get(TURN);
    if (turn === undefined || turn.checked) return out;
    await $.state.set(TURN, { ...turn, checked: true });
    await notify($, turn.prompt, actionOf(e.tool, e.input));
  } catch {
    // A failed check shows no notice. The call goes on with its verdict.
  }
  return out;
};
