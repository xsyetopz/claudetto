// The mod handlers of the `decide` slice. With the option `off`, or with no key, they change nothing. Jev gets one request with `$.http.fetch`, and the key goes only in its header.
// Each `$.env.get` call needs a literal name, so that `claude plugin validate` can follow it.

import type { EngineInterface, MatchedHook, PluginOptions } from "claude-code";
import { jevBody, postJev } from "../../../kernel/jev.ts";
import { keyOf, type Mode, modeOf } from "../domain/request.ts";
import { JEV_ANSWERED, JEV_CONTINUE, TOOL_ASK } from "../prompts.ts";
import { judgeQuestions } from "./ask.ts";

const kept: { mode: Mode; key: string } = { mode: "off", key: "" };

/** Keeps the mode and the key from the `userConfig` values, which the generated `register` sets once. */
export const keepOptions = (options: PluginOptions): void => {
  kept.mode = modeOf(options);
  kept.key = keyOf(options);
};

/** The key of the option, else the exported `TYPESAFE_API_KEY` of 0.3.0-alpha.1. */
const jevKey = async ($: EngineInterface): Promise<string | undefined> =>
  kept.key || (await $.env.get("TYPESAFE_API_KEY"));

type DescribeHook = MatchedHook<
  "tool.describe",
  { readonly tool: readonly ["AskUserQuestion"] }
>;

type AskHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["AskUserQuestion"] }
>;

/** Answers the call with the picks of Jev when it is sure of each question, else adds the picks to the dialog. */
export const onAskUserQuestion: AskHook = async ($, e, next) => {
  if (kept.mode !== "jev") return next(e);
  const key = await jevKey($);
  if (!key) return next(e);
  const outcome = await judgeQuestions(e.questions, (request) =>
    postJev(
      key,
      jevBody(request.state, request.questions),
      { fetch: (url, init) => $.http.fetch(url, init) },
      { sleep: (ms, options) => $.clock.sleep(ms, options) },
    ),
  );
  if (outcome === undefined) return next(e);
  if ("questions" in outcome)
    return next({ ...e, questions: outcome.questions });
  const { answered } = outcome;
  // The `tool.call` handler answers an `AskUserQuestion` call with the picks of Jev when Jev is sure about each question (documented: a `tool.call` hook answers with `{ result }`).
  // The answers are keyed by the question text, as when the user picks. The context names Jev.
  const told = answered.map((p) =>
    JEV_ANSWERED({ ...p, confidence: p.confidence.toFixed(2) }),
  );
  return {
    result: {
      questions: e.questions,
      answers: Object.fromEntries(answered.map((p) => [p.question, p.choice])),
    },
    context: [[...told, JEV_CONTINUE].join("\n")],
  };
};

/** Adds the line for Jev to the tool text, only when Jev can answer. */
export const onDescribe: DescribeHook = async ($, e, next) => {
  const answer = await next(e);
  if (kept.mode !== "jev" || !(await jevKey($))) return answer;
  return { ...answer, description: `${answer.description}\n\n${TOOL_ASK}` };
};
