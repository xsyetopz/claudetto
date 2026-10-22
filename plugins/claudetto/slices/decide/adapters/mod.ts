// The mod handlers of the `decide` slice. With the option `off`, or with no key, the handlers send no call and change nothing.
// The `tool.call` handler answers an `AskUserQuestion` call with the picks of Jev when Jev is sure about each question (documented: a `tool.call` hook answers with `{ result }`).
// When Jev is not sure about one question, the dialog shows, with the pick of Jev in the description of the picked option.
// The `tool.describe` handler adds the line to the tool text that tells Claude to put the facts in the question.
// Each `$.env.get` call needs a literal name, so that `claude plugin validate` can follow it.

import type { EngineInterface, MatchedHook, PluginOptions } from "claude-code";
import { type CliCall, type Mode, modeOf } from "../domain/request.ts";
import { JEV_TIMEOUT_MS } from "../limits.ts";
import { JEV_ANSWERED, JEV_CONTINUE, TOOL_ASK } from "../prompts.ts";
import { type CliRun, judgeQuestions } from "./ask.ts";

/** Runs the CLI `claudetto-decide` with the key in its environment, never in the arguments. */
const runCli = async (
  $: EngineInterface,
  key: string,
  call: CliCall,
): Promise<CliRun> => {
  const run = await $.process.run(
    [
      "bun",
      "--no-env-file",
      `${$.plugin.root}/bin/claudetto-decide`,
      ...call.args,
    ],
    {
      env: { TYPESAFE_API_KEY: key },
      timeoutMs: JEV_TIMEOUT_MS,
      ...(call.stdin === undefined ? {} : { stdin: call.stdin }),
    },
  );
  return { exitCode: run.exitCode, stdout: run.stdout, stderr: run.stderr };
};

/** The mode of the `decide` option, which the generated `register` sets once with `keepOptions`. */
const kept: { mode: Mode } = { mode: "off" };

/** Keeps the mode from the `userConfig` values of the plugin for the hooks of the slice. */
export const keepOptions = (options: PluginOptions): void => {
  kept.mode = modeOf(options);
};

export type DescribeHook = MatchedHook<
  "tool.describe",
  { readonly tool: readonly ["AskUserQuestion"] }
>;

export type AskHook = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["AskUserQuestion"] }
>;

/** The `AskUserQuestion` call answered by Jev, or with the pick of Jev in each question that Jev is sure about. With the option not `jev`, or with no key, the call passes unchanged. */
export const onAskUserQuestion: AskHook = async ($, e, next) => {
  if (kept.mode !== "jev") return next(e);
  const key = await $.env.get("TYPESAFE_API_KEY");
  if (!key) return next(e);
  const outcome = await judgeQuestions(e.questions, (call) =>
    runCli($, key, call),
  );
  if (outcome === undefined) return next(e);
  if ("questions" in outcome)
    return next({ ...e, questions: outcome.questions });
  const { answered } = outcome;
  // The answers come back keyed by the question text, as when the user picks.
  // The context names Jev, so Claude tells the user who answered.
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

/** The text of the `AskUserQuestion` tool with the line for Jev, only when Jev can answer. */
export const onDescribe: DescribeHook = async ($, e, next) => {
  const answer = await next(e);
  if (kept.mode !== "jev" || !(await $.env.get("TYPESAFE_API_KEY")))
    return answer;
  return { ...answer, description: `${answer.description}\n\n${TOOL_ASK}` };
};
