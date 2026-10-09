// The glue of the router for the hooks module: the handlers of `prompt.submit`, `agent.spawn`, and `turn.step`.
// The decisions come from `route.mjs`, and the step rewrite from `apply.mjs`.
// A handler that calls `$` sits here, which the validation of the hooks module follows (probe P1, task 2.27).
// The state is in the memory of the process: the decision of the last prompt for each session,
// and the pair of each subagent by its `agentId`.
//
// No handler has a `.catch`, so a failure leaves the request as the engine made it.

import { applied, mainRewrite } from "./apply.mjs";
import { stepDecision } from "./cap.mjs";
import { USER_ORIGINS } from "./data.mjs";
import { SUBAGENT_MAP_MAX } from "./limits.mjs";
import { routePrompt, routeSpawn } from "./route.mjs";

/** The decision, turn, and rewrite of the main loop, for each session. */
const sessions = new Map();
/** The `{ model, effort }` of each subagent, by `agentId`. A `Map` keeps the order of insertion. */
const subagents = new Map();

/** The blocking variables that are set, as the `env` of the router state. */
async function routerEnv($) {
  return {
    CLAUDE_CODE_EFFORT_LEVEL: await $.env.get("CLAUDE_CODE_EFFORT_LEVEL"),
    CLAUDE_CODE_SUBAGENT_MODEL_FORCE: await $.env.get(
      "CLAUDE_CODE_SUBAGENT_MODEL_FORCE",
    ),
  };
}

/** The router state: the blocking variables and the effort that the user set. */
async function routerState($) {
  const [env, settings] = await Promise.all([routerEnv($), $.settings.read()]);
  return { env, sessionEffort: settings?.effortLevel, failedFixes: 0 };
}

/** `prompt.submit`: classify the prompt of the user and keep the decision for the first step of its turn. */
export async function onPromptSubmit($, e, next) {
  if (USER_ORIGINS.includes(e.origin?.kind)) {
    const id = await $.session.id();
    const rec = sessions.get(id) ?? {};
    rec.pending = routePrompt(e.text, await routerState($));
    sessions.set(id, rec);
  }
  return next(e);
}

/**
 * `agent.spawn`: classify the task, set the routed model, and keep the pair for the steps of the subagent.
 * The hook runs before the prompt variant hook, so that hook sees the routed model.
 */
export async function onAgentSpawn($, e, next) {
  // A teammate takes only `background` and `cwd`, and a workflow agent takes only a refusal.
  if (e.isTeammate || e.workflow) return next(e);
  const route = routeSpawn(
    {
      subagentType: e.subagentType,
      prompt: e.prompt,
      description: e.description,
      model: e.model,
    },
    await routerState($),
  );
  if (!route.routed) return next(e);
  const result = await next({ ...e, model: route.model });
  if (result?.agentId) {
    subagents.set(result.agentId, { model: route.model, effort: route.effort });
    if (subagents.size > SUBAGENT_MAP_MAX)
      subagents.delete(subagents.keys().next().value);
  }
  return result;
}

/** The result of `read()`, or undefined when it fails. The step then stays as it is, with no cap from the setting. */
async function attempt(read) {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

/** The step input to send, from the stored pair of the subagent or the stored rewrite of the turn. */
async function stepInput($, e) {
  if (e.agentId !== undefined) {
    const pair = subagents.get(e.agentId);
    return pair ? applied(e, pair) : e;
  }
  const rec = sessions.get(await $.session.id());
  if (!rec) return e;
  const stored = rec.turnId === e.turnId ? rec.applied : undefined;
  const first = e.index === 0;
  const sessionEffort =
    first && rec.pending?.routed
      ? (await attempt(() => $.settings.read()))?.effortLevel
      : undefined;
  const rewrite = stepDecision(
    stored,
    first ? mainRewrite(e, rec.pending, sessionEffort) : undefined,
    e.index,
  );
  if (first) rec.pending = undefined;
  rec.turnId = e.turnId;
  rec.applied = rewrite;
  return applied(e, rewrite);
}

/**
 * `turn.step`: a stream hook.
 * Each step input carries the session values again (tasks 2.4 and 2.10), so a subagent gets its pair at every step,
 * and the main loop gets the rewrite of the first step of the turn at every step of that turn.
 */
export async function* onStep($, e, next) {
  return yield* next(await stepInput($, e));
}
