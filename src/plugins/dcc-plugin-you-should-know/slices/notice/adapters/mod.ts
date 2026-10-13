// The mod handlers of the `notice` slice: the start of a turn, and the check of the first call of a turn that changes something.
// Each `$` call is in this file, because `$` is not followed across an import.
// The check fails open: a failed or slow model call shows no notice, and the verdict of the call never changes.

import type { EngineInterface, ModelForkResult } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import {
  actionOf,
  completePrompt,
  forkPrompt,
  headsUpNote,
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
} from "../limits.ts";
import { DISMISS, HEADS_UP } from "./band.ts";

/** The session values that `types/index.d.ts` declares. */
const TURN = { plugin: "dcc-plugin-you-should-know", key: "turn" } as const;
const PATH = { plugin: "dcc-plugin-you-should-know", key: "path" } as const;
const SHOWN = { plugin: "dcc-plugin-you-should-know", key: "shown" } as const;
const OFFER = { plugin: "dcc-plugin-you-should-know", key: "offer" } as const;
const NOTE = { plugin: "dcc-plugin-you-should-know", key: "note" } as const;

/** The HTTP status that a subscription gets for a separate call from a hook when `CLAUDE_CODE_ATTRIBUTION_HEADER` is `0`. */
const TOO_MANY_REQUESTS = 429;

/** Clears the band, so that no choice of it is drawn again. */
const clearOffer = async ($: EngineInterface): Promise<void> => {
  await $.state.set(OFFER, null);
  $.ui.invalidate("ui.render");
};

/**
 * The `turn.start` hook: a new turn is not checked yet, and a band of the turn before it is dropped.
 * A heads-up note stays until the main agent reads it once.
 * A turn with no typed prompt keeps the prompt of the turn before it.
 */
export const onTurnStart: Handler<"turn.start"> = async ($, e, next) => {
  const out = await next(e);
  const { value: last } = await $.state.get(TURN);
  await $.state.set(TURN, {
    id: e.turnId,
    prompt: e.text || (last?.prompt ?? ""),
    checked: false,
  });
  await clearOffer($);
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

/**
 * Shows the topic of the pending action, if the model gives one that did not show in this session.
 * A verdict that arrives after its turn ended shows no band.
 */
const notify = async (
  $: EngineInterface,
  turnId: string,
  request: string,
  action: string,
): Promise<void> => {
  const { value: shown = [] } = await $.state.get(SHOWN);
  const answer = await answerFor($, request, action, shown);
  const topic = answer === undefined ? undefined : topicOf(answer);
  if (topic === undefined || isRepeat(topic, shown)) return;
  const { value: now } = await $.state.get(TURN);
  if (now?.id !== turnId) return;
  await $.state.set(SHOWN, [...shown, topic]);
  await $.state.set(OFFER, { topic });
  $.ui.invalidate("ui.render");
};

/**
 * The closure at the end of the `ui.press` chain of a band button.
 * The `ui.press` hooks of this slice do the work, so the closure does nothing.
 * The engine requires a `Button` to hold a closure, and the render hook must not skip without it.
 */
const pressed = (): void => {};

/**
 * The `ui.render` hook of the band: the topic of the offer, drawn above the prompt.
 * The band draws the tree that `$.ui.resolve` builds, so the terminal and the desktop surfaces draw the same rows.
 */
export const onRender: Handler<"ui.render"> = async ($, e, next) => {
  const { value: offer } = await $.state.get(OFFER);
  if (e.props.hasSurvey || offer === undefined || offer === null)
    return next(e);
  const { Box, Text, Button } = $.ui.resolve(e);
  return Box({
    flexDirection: "column",
    marginTop: 1,
    children: [
      Text({ wrap: "wrap", children: `You should know: ${offer.topic}` }),
      Button({
        key: HEADS_UP,
        label: "Give a heads-up",
        hotkey: "1",
        onPress: pressed,
      }),
      Button({ key: DISMISS, label: "Dismiss", hotkey: "0", onPress: pressed }),
    ],
  });
};

/**
 * The `ui.press` hook of the heads-up choice: the topic goes into the prompt box, quoted, and the person adds the heads-up there.
 * The same heads-up waits for the next call of the main agent, which reads it in the running turn (`onHeadsUpContext`).
 */
export const onHeadsUp: Handler<"ui.press"> = async ($, e, next) => {
  const { value: offer } = await $.state.get(OFFER);
  await clearOffer($);
  if (offer !== undefined && offer !== null) {
    await $.prompt.fill({ text: `> ${offer.topic}\n`, mode: "insert" });
    await $.state.set(NOTE, headsUpNote(offer.topic));
  }
  return next(e);
};

/**
 * The `tool.call` hook of a heads-up: the next call of the main agent that runs gets the note after its result, once.
 * A call of a subagent, and a denied call, get no note, so the note waits for a call that ran.
 */
export const onHeadsUpContext: Handler<"tool.call"> = async ($, e, next) => {
  const out = await next(e);
  if (e.agentId !== undefined || out.result === undefined) return out;
  const { value: note } = await $.state.get(NOTE);
  if (note === undefined || note === null) return out;
  await $.state.set(NOTE, null);
  return { ...out, context: [...(out.context ?? []), note] };
};

/** The `ui.press` hook of the dismiss choice: the band goes, and the topic stays in the session's seen list. */
export const onDismiss: Handler<"ui.press"> = async ($, e, next) => {
  await clearOffer($);
  return next(e);
};

/**
 * The `tool.check` hook: the first call of a turn that changes something gets one check, and the call runs as the verdict says.
 * The model call is not awaited, so the tool does not wait for it: the band comes when the verdict does.
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
    void notify($, turn.id, turn.prompt, actionOf(e.tool, e.input)).catch(
      () => {
        // A failed check shows no notice. The call goes on with its verdict.
      },
    );
  } catch {
    // A failed check shows no notice. The call goes on with its verdict.
  }
  return out;
};
