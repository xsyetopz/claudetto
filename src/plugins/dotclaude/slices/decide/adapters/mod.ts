// The mod handlers of the `decide` slice.
// `session.start` registers the tool at each start, with or without a key, so the fallback is reachable with no key.
// `tool.call` serves the tool: it tries Jev when the key is set, and the fallback model when Jev gives no answer.
//
// `claude plugin validate` follows `$` only into a function of one file,
// and each `$.env.get` call needs a literal name.
// For this reason, each function that touches `$` is here, and the rules are in `domain/` and in the adapters.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import type { CliCall } from "../domain/request.ts";
import { parseInput } from "../domain/request.ts";
import { route } from "../domain/route.ts";
import { resultText } from "../domain/text.ts";
import { toolSpec } from "../domain/tool.ts";
import {
  FALLBACK_MAX_TOKENS,
  FALLBACK_MODEL,
  FALLBACK_TIMEOUT_MS,
  JEV_TIMEOUT_MS,
} from "../limits.ts";
import { type Completion, createFallback } from "./fallback.ts";
import { type CliRun, createJev } from "./jev.ts";

/** Runs the CLI `dotclaude-decide` with the key in its environment, never in the arguments. */
const runCli = async (
  $: EngineInterface,
  key: string,
  call: CliCall,
): Promise<CliRun> => {
  const run = await $.process.run(
    [
      "bun",
      "--no-env-file",
      `${$.plugin.root}/bin/dotclaude-decide`,
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

/** One completion with the fallback model, which answers for Claude and not for Jev. */
const complete = async (
  $: EngineInterface,
  prompt: { system: string; prompt: string },
): Promise<Completion> => {
  const reply = await $.model.complete({
    model: FALLBACK_MODEL,
    system: prompt.system,
    prompt: prompt.prompt,
    maxTokens: FALLBACK_MAX_TOKENS,
    effort: "low",
    timeoutMs: FALLBACK_TIMEOUT_MS,
  });
  return reply.isAnswered
    ? { isAnswered: true, text: reply.text }
    : { isAnswered: false };
};

// A failure here reaches the log of Claude Code, and the session goes on with no tool.
export const onSessionStart: Handler<"session.start"> = async ($, e, next) => {
  await $.tool.register(toolSpec());
  return next(e);
};

export const onSecondOpinion: Handler<"tool.call"> = async ($, e) => {
  // An MCP tool gets its arguments as the fields of `e`, next to `tool` and `tool_use_id`.
  const parsed = parseInput(e);
  if (!parsed.ok) return { result: parsed.error };
  const key = await $.env.get("TYPESAFE_API_KEY");
  const jev = key ? createJev((call) => runCli($, key, call)) : undefined;
  const fallback = createFallback((prompt) => complete($, prompt));
  return { result: resultText(await route(jev, fallback, parsed.request)) };
};
