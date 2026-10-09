// The classic `PreToolUse` fallback of the router (design D13, task 11.4).
// The module routes a subagent in `hooks/register.mjs`, through `agent.spawn` and `turn.step`.
// This hook is the other route, for the case that the `turn.step` route fails.
// It does nothing until `DOTCLAUDE_ROUTER_ROUTE=classic` is set, for example in `env` of the settings.
// It then returns `updatedInput` for an `Agent` call, with a model alias and an effort, and no permission decision.
// The module sees the `model` in the input as an explicit choice, so it leaves that spawn alone.
//
// This is a classic command hook, so it is not in the import graph of the hooks module and may import `node:` modules.
// It fails open: on an error, it prints nothing, and the call goes on as it was.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALIASES, FALLBACK_ENV } from "./data.mjs";
import { routeSpawn } from "./route.mjs";

/** The effort that the user set in settings, from the most specific file, or undefined. */
export function settingsEffort(cwd, home) {
  for (const file of [
    join(cwd ?? ".", ".claude", "settings.local.json"),
    join(cwd ?? ".", ".claude", "settings.json"),
    join(home ?? "", ".claude", "settings.json"),
  ]) {
    try {
      const level = JSON.parse(readFileSync(file, "utf8")).effortLevel;
      if (level) return level;
    } catch {}
  }
  return undefined;
}

/** The `PreToolUse` output for `payload`, or undefined when the hook leaves the call as it is. */
export function decide(payload, env, sessionEffort) {
  if (env[FALLBACK_ENV.name] !== FALLBACK_ENV.value) return undefined;
  if (payload?.tool_name !== "Agent") return undefined;
  const input = payload.tool_input ?? {};
  const route = routeSpawn(
    {
      subagentType: input.subagent_type,
      prompt: input.prompt,
      description: input.description,
      model: input.model,
      effort: input.effort,
    },
    { env, sessionEffort },
  );
  const alias = route.routed ? ALIASES[route.model] : undefined;
  if (!alias) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      updatedInput: { ...input, model: alias, effort: route.effort },
    },
  };
}

if (import.meta.main) {
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    const env = process.env;
    if (env[FALLBACK_ENV.name] === FALLBACK_ENV.value) {
      const out = decide(payload, env, settingsEffort(payload.cwd, env.HOME));
      if (out) process.stdout.write(JSON.stringify(out));
    }
  } catch {}
}
