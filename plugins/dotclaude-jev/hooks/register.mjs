// The hooks module of dotclaude-jev.
// The second-opinion tool is registered at `session.start`, and only when `TYPESAFE_API_KEY` is set.
// Without the key, no tool is registered, so it costs no tokens.
// The `AskUserQuestion` hook adds the pick of Jev to a facts question, and runs only with the key.
// The client imports `node:` modules, so the module runs it as a child process.
// Each `$` call is in this file, because `$` is not followed across an import.

import { jevRequest, withPicks } from "../features/jev/ask.mjs";
import { clientArgv, clientInit, outcome } from "../features/jev/run.mjs";
import {
  clientArgs,
  fallback,
  fullName,
  NO_KEY,
  result,
  toolSpec,
} from "../features/jev/tool.mjs";

/** Runs the client, and gives its outcome. */
async function runClient($, key, args, stdin) {
  // A run that throws is not caught: the callers below answer for it.
  const run = await $.process.run(
    clientArgv($.plugin.root, args),
    clientInit(key, stdin),
  );
  return outcome(run);
}

/** The text result of one call of the second-opinion tool. */
async function secondOpinion($, input) {
  const call = clientArgs(input);
  if (call.error) return call.error;
  const key = await $.env.get("TYPESAFE_API_KEY");
  if (!key) return NO_KEY;
  return result(await runClient($, key, call.args, call.stdin));
}

/** The `AskUserQuestion` call with the pick of Jev in each facts question. */
async function askUserQuestion($, e, next) {
  if (!Array.isArray(e.questions)) return next(e);
  const key = await $.env.get("TYPESAFE_API_KEY");
  if (!key) return next(e);
  const request = jevRequest(e.questions);
  if (!request) return next(e);
  const run = await runClient(
    $,
    key,
    ["ask"],
    JSON.stringify({ state: request.state, questions: request.questions }),
  );
  if (!run.ok) return next(e);
  let picks;
  try {
    picks = JSON.parse(run.stdout);
  } catch (err) {
    // The output of Jev is not valid JSON, so the question stays as asked.
    // Any other error reaches the log of Claude Code, and the question also stays as asked.
    if (!(err instanceof SyntaxError)) throw err;
    return next(e);
  }
  return next({ ...e, questions: withPicks(e.questions, picks) });
}

export function register(on) {
  on("session.start", async ($, e, next) => {
    // A failure here reaches the log of Claude Code and skips the hook, so the session goes on with no tool.
    const key = await $.env.get("TYPESAFE_API_KEY");
    if (key) await $.tool.register(toolSpec());
    return next(e);
  });
  // One `tool.call` hook serves both tools, because a second one with no matcher is refused.
  on("tool.call", async ($, e, next) => {
    if (e.tool === "AskUserQuestion") return askUserQuestion($, e, next);
    if (e.tool !== fullName($.plugin.name)) return next(e);
    try {
      return { result: await secondOpinion($, e) };
    } catch {
      // The catch has no narrower test, because `$.process.run` documents no error type.
      // The text tells the model that the tool run failed, so the failure is not silent.
      return { result: fallback("The tool run failed.") };
    }
  });
}
