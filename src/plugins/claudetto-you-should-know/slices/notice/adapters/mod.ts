// The mod handlers of the `notice` slice: the gate at the start of a session, the start of a turn, and the check of the first call of a turn that changes something.
// Each `$` call is in this file, because `$` is not followed across an import.
// The check fails open: a failed or slow model call shows no notice, and the verdict of the call never changes.

import type {
  EngineInterface,
  MatchedHook,
  ModelForkResult,
} from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { oneLine } from "../../../../../kernel/text.ts";
import {
  actionOf,
  completePrompt,
  forkPrompt,
  isRepeat,
  type Shown,
  SYSTEM,
} from "../domain/prompt.ts";
import { isChange } from "../domain/reads.ts";
import { isFlagOn, readingOf, STATE_FILE } from "../domain/verdict.ts";
import {
  COMPLETE_MODEL,
  COMPLETE_TIMEOUT_MS,
  FORK_WAIT_MS,
  MAX_REPLY_TOKENS,
} from "../limits.ts";
import {
  CONTEXT_NOTE,
  HEADS_UP_NOTE,
  OFF_NOTICE,
  OFFER_TEXT,
} from "../prompts.ts";
import { DISMISS, HEADS_UP } from "./band.ts";
import { holds } from "./claims.ts";

/** The session values that `types/index.d.ts` declares. */
const TURN = { plugin: "claudetto-you-should-know", key: "turn" } as const;
const PATH = { plugin: "claudetto-you-should-know", key: "path" } as const;
const SHOWN = { plugin: "claudetto-you-should-know", key: "shown" } as const;
const OFFER = { plugin: "claudetto-you-should-know", key: "offer" } as const;
const NOTE = { plugin: "claudetto-you-should-know", key: "note" } as const;
const ACTIVE = { plugin: "claudetto-you-should-know", key: "active" } as const;

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

/** One debug line for a check that did not give a topic, so that a failed check leaves a trace. */
const trace = ($: EngineInterface, what: string): void =>
  $.ui.log(`claudetto-you-should-know: ${what}`, { to: "debug" });

/**
 * The answer of the model for the pending action, from one model call.
 * It tries the separate call first, and after an HTTP 429 the next checks of the session use a fork.
 * The check that got the 429 ends with no topic, because a turn has one model call at most.
 */
const answerFor = async (
  $: EngineInterface,
  request: string,
  action: string,
  shown: readonly Shown[],
): Promise<string | undefined> => {
  const { value: path = "complete" } = await $.state.get(PATH);
  if (path === "fork") return forkAnswer($, forkPrompt(action, shown));
  const reply = await $.model.complete({
    model: COMPLETE_MODEL,
    system: SYSTEM,
    prompt: completePrompt(request, action, shown),
    maxTokens: MAX_REPLY_TOKENS,
    timeoutMs: COMPLETE_TIMEOUT_MS,
  });
  if (reply.isAnswered) return reply.text;
  const is429 =
    reply.reason === "api-error" && reply.status === TOO_MANY_REQUESTS;
  trace(
    $,
    `the check call failed: ${reply.reason}, ${is429 ? "HTTP 429" : ""}`,
  );
  if (is429) await $.state.set(PATH, "fork");
  return undefined;
};

/** True when the session draws nowhere, as in `-p`, where nobody sees a band. */
const isHeadless = ($: EngineInterface): Promise<boolean> =>
  $.session.surfaces().then(
    (surfaces) => surfaces.length === 0,
    () => false,
  );

/**
 * Shows the topic of the pending action, if the model gives one that did not show in this session and the disk backs its claims.
 * A verdict that arrives after its turn ended shows no band.
 * On a screen the topic goes to the band.
 * With no screen the topic goes to the main agent as the note of its next tool result.
 */
const notify = async (
  $: EngineInterface,
  turnId: string,
  request: string,
  action: string,
): Promise<void> => {
  const { value: shown = [] } = await $.state.get(SHOWN);
  const answer = await answerFor($, request, action, shown);
  if (answer === undefined) return;
  const reading = readingOf(answer);
  if (reading === "none") return;
  if (reading === "malformed")
    return trace($, "the answer is not the object that the prompt asks for");
  const { topic, id, claims } = reading;
  if (isRepeat(id, shown)) return;
  for (const claim of claims) {
    const stat = await $.fs.stat(claim.path).catch(() => undefined);
    const isFile = stat?.kind === "file";
    const text =
      isFile && claim.state === "cut"
        ? await $.fs.read(claim.path).catch(() => undefined)
        : undefined;
    const disk = { exists: !!stat, size: isFile ? stat.size : undefined, text };
    if (!holds(claim, disk))
      return trace(
        $,
        // biome-ignore lint/plugin: a debug log line that only a developer reads
        `dropped a topic, because the disk does not back the claim that ${claim.path} is ${claim.state}`,
      );
  }
  const { value: now } = await $.state.get(TURN);
  if (now?.id !== turnId) return;
  await $.state.set(SHOWN, [...shown, { id, topic }]);
  if (await isHeadless($)) {
    await $.state.set(NOTE, CONTEXT_NOTE({ topic }));
    return;
  }
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
export const onRender: MatchedHook<
  "ui.render",
  { component: "AbovePrompt" }
> = async ($, e, next) => {
  const { value: offer } = await $.state.get(OFFER);
  if (e.props.hasSurvey || offer === undefined || offer === null)
    return next(e);
  const { Box, Text, Button } = $.ui.resolve(e);
  return Box({
    flexDirection: "column",
    marginTop: 1,
    children: [
      Text({
        wrap: "wrap",
        children: OFFER_TEXT({ topic: offer.topic }),
      }),
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
    await $.state.set(NOTE, HEADS_UP_NOTE({ topic: offer.topic }));
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
 * On a screen the model call is not awaited, so the tool does not wait for it: the band comes when the answer does.
 * With no screen the check waits for the answer, so that the note comes with the result of this call.
 * A query, a call of a subagent, a denied call, and a read get no check.
 */
export const onCheck: Handler<"tool.check"> = async ($, e, next) => {
  const out = await next(e);
  if (e.tool_use_id === undefined || e.agentId !== undefined) return out;
  if (out.decision === "deny" || !isChange(e.tool, e.input)) return out;
  try {
    const { value: active } = await $.state.get(ACTIVE);
    if (active !== true) return out;
    const { value: turn, version } = await $.state.get(TURN);
    if (turn === undefined || turn.checked) return out;
    // The write names the version, so two calls that check at the same time start one model call.
    const claim = await $.state.set(
      TURN,
      { ...turn, checked: true },
      { ifVersion: version },
    );
    if (!claim.isSet) return out;
    const check = notify(
      $,
      turn.id,
      turn.prompt,
      actionOf(e.tool, e.input),
    ).catch((error: unknown) => trace($, `the check failed: ${String(error)}`));
    if (await isHeadless($)) await check;
  } catch (error) {
    trace($, `the check failed: ${String(error)}`);
  }
  return out;
};

/**
 * The `session.start` hook: reads the gate of the add-on, the cached value `tengu_jolly_dewdrop` of the account.
 * No API gives the value to a plugin, so the hook reads the state file of Claude Code.
 * When the value is not `true`, the add-on makes no check, and one line says why.
 */
export const onStart: Handler<"session.start"> = async ($, e, next) => {
  const started = await next(e);
  const dir =
    (await $.env.get("CLAUDE_CONFIG_DIR")) ?? (await $.env.get("HOME"));
  const file =
    dir === undefined
      ? undefined
      : await $.fs.read(`${dir}/${STATE_FILE}`).then(
          (text) => (typeof text === "string" ? text : undefined),
          () => undefined,
        );
  const isOn = isFlagOn(file);
  await $.state.set(ACTIVE, isOn);
  if (!isOn) $.ui.log(oneLine(OFF_NOTICE({ plugin: $.plugin.name })));
  return started;
};
