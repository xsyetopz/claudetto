// The mod handlers of the `spec` slice. Each makes no model call, so `requests` is 0.
//
// `agent.spawn` moves the lane of a package to `doing` when `/ship` starts the `implementer` of the package.
// `turn.complete` moves the lane to `review` when that subagent ends.
// Both run `dotclaude-spec lane` with `$.process.run`, in the folder of the main session.
// This is where `lane` works, because it refuses a linked worktree.
//
// `claude plugin validate` follows `$` only into a function of one file.
// For this reason, each function that touches `$` is here, and the rules are in `domain/`.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import { laneArgs, packageOf } from "../domain/ship-lane.ts";

/** The package of each running `implementer`, by its `agentId`. */
const running = new Map<string, string>();

/** Forgets the running subagents. A test calls it between runs. */
export const resetState = (): void => {
  running.clear();
};

/**
 * Runs `dotclaude-spec lane` for `pkg`. A failed run changes nothing, and the skill still names the command.
 * The catch has no narrower test, because `$.process.run` documents no error type.
 */
const moveLane = async (
  $: EngineInterface,
  pkg: string,
  lane: "doing" | "review",
): Promise<void> => {
  try {
    await $.process.run([
      "bun",
      "--no-env-file",
      `${$.plugin.root}/bin/dotclaude-spec`,
      ...laneArgs(pkg, lane),
    ]);
  } catch {
    $.ui.log(`dotclaude-spec lane ${pkg} ${lane} did not run`, {
      to: "debug",
    });
  }
};

/** Moves the package of an `implementer` prompt to `doing` once the subagent started. */
export const onSpawn: Handler<"agent.spawn"> = async ($, e, next) => {
  const out = await next(e);
  const pkg = packageOf(e.prompt);
  if (pkg === undefined || out.deny !== undefined || !out.agentId) return out;
  running.set(out.agentId, pkg);
  await moveLane($, pkg, "doing");
  return out;
};

/** Moves the package of a subagent that ended to `review`. */
export const onComplete: Handler<"turn.complete"> = async ($, e, next) => {
  const out = await next(e);
  const pkg = e.agentId ? running.get(e.agentId) : undefined;
  if (e.agentId === undefined || pkg === undefined) return out;
  running.delete(e.agentId);
  await moveLane($, pkg, "review");
  return out;
};
