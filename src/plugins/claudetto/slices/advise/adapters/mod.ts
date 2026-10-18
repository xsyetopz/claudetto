// The mod handlers of the `advise` slice. The `advisor` option is `builtin` by default, and then the slice registers no tool.
// `session.start` registers the tool for `claudetto`, and `tool.call` answers it with one `$.model.complete` call.
// `claude plugin validate` follows `$` only into a function of one file, so each function that touches `$` is here.

import type { ModelTextBlock, PluginOptions } from "claude-code";
import { GOAL_FILE } from "../../../../../kernel/paths.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { refusal } from "../domain/calls.ts";
import { cutContext, readGoal } from "../domain/context.ts";
import { type Options, optionsOf } from "../domain/options.ts";
import { resultText } from "../domain/result.ts";
import { toolSpec } from "../domain/tool.ts";
import { CONTEXT_BYTES, MAX_TOKENS, TIMEOUT_MS } from "../limits.ts";
import { ASK, ERROR_QUESTION, PLAN, SYSTEM } from "../prompts.ts";

/** The options, which the generated `register` sets once with `keepOptions`. */
const kept: { options: Options } = { options: optionsOf({}) };

export const keepOptions = (values: PluginOptions): void => {
  kept.options = optionsOf(values);
};

export const onSessionStart: Handler<"session.start"> = async ($, e, next) => {
  if (kept.options.advisor === "claudetto") await $.tool.register(toolSpec());
  return next(e);
};

export const onAdvise: Handler<"tool.call"> = async ($, e) => {
  // An MCP tool gets its arguments as the fields of `e`.
  const { question = "" } = e as unknown as { question?: string };
  if (typeof question !== "string" || !question.trim())
    return { result: ERROR_QUESTION };
  const messages = await $.session.messages();
  const refused = refusal(messages, e.tool_use_id);
  if (refused) return { result: refused };
  const root =
    (await $.env.get("CLAUDE_PROJECT_DIR").catch(() => undefined)) ||
    (await $.session.root().catch(() => ""));
  const goal = readGoal(
    await $.fs
      .read(root ? `${root.replace(/\/+$/, "")}/${GOAL_FILE}` : GOAL_FILE)
      .catch(() => null),
  );
  const part = cutContext({ question, messages, goal, limit: CONTEXT_BYTES });
  const { model, effort } = kept.options;
  const prompt: ModelTextBlock[] = [{ text: ASK(part) }];
  if (part.plan)
    prompt.unshift({ text: PLAN({ plan: part.plan }), cache: true });
  const reply = await $.model.complete({
    model,
    effort,
    maxTokens: MAX_TOKENS,
    timeoutMs: TIMEOUT_MS,
    // The system prompt and the plan stay the same between calls, so they carry the cache marks.
    system: [{ text: SYSTEM, cache: true as const }],
    prompt,
  });
  return { result: resultText(reply, model) };
};
