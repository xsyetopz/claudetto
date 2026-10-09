// The hooks module of dotclaude-jev.
// The second-opinion tool is registered at `session.start`.
// It is loaded with `TYPESAFE_API_KEY`, and deferred without it.
// The `AskUserQuestion` hook adds the pick of Jev to a facts question, and runs only with the key.
// The client imports `node:` modules, so the module runs it as a child process.
// Each `$` call is in this file, because `$` is not followed across an import.

import { jevRequest, withPicks } from "../features/jev/ask.mjs";
import {
  clientArgv,
  clientInit,
  failed,
  outcome,
} from "../features/jev/run.mjs";
import {
  clientArgs,
  fullName,
  INVALID_INPUT,
  NO_KEY,
  result,
  toolSpec,
} from "../features/jev/tool.mjs";

/** Runs the client, and gives its outcome. */
async function runClient($, key, args, stdin) {
  try {
    const run = await $.process.run(
      clientArgv($.plugin.root, args),
      clientInit(key, stdin),
    );
    return outcome(run);
  } catch {
    return failed;
  }
}

/** The text result of one call of the second-opinion tool. */
async function secondOpinion($, input) {
  const call = clientArgs(input);
  if (!call) return INVALID_INPUT;
  const key = await $.env.get("TYPESAFE_API_KEY");
  if (!key) return NO_KEY;
  return result(await runClient($, key, call.args, call.stdin));
}

/** The `AskUserQuestion` call with the pick of Jev in each facts question. */
async function askUserQuestion($, e, next) {
  if (!Array.isArray(e.questions)) return next(e);
  try {
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
    return next({
      ...e,
      questions: withPicks(e.questions, JSON.parse(run.stdout)),
    });
  } catch {
    // The output of Jev is not valid JSON.
    return next(e);
  }
}

export function register(on) {
  on("session.start", async ($, e, next) => {
    try {
      const key = await $.env.get("TYPESAFE_API_KEY");
      await $.tool.register(toolSpec(Boolean(key)));
    } catch {
      // The tool is missing for this session, and the session goes on.
    }
    return next(e);
  });
  // One `tool.call` hook serves both tools, because a second one with no matcher is refused.
  on("tool.call", async ($, e, next) => {
    if (e.tool === "AskUserQuestion") return askUserQuestion($, e, next);
    if (e.tool !== fullName($.plugin.name)) return next(e);
    try {
      return { result: await secondOpinion($, e) };
    } catch {
      return {
        result: "The second-opinion tool failed. Answer from your own check.",
      };
    }
  });
}
