// The mod handlers of the `agents` slice (D2 of change `0-3-0`).
// `agent.offer` hides each built-in agent and `claudetto:main`, the agent of the main thread,
// so the model sees only the plugin agents that it can start.
// `tool.call` gives an `Agent` call with no `subagent_type` the type `claudetto:worker`.
// It runs before the permission step, which treats such a call as `general-purpose`,
// so the `Agent(general-purpose)` deny and `agent.offer` would refuse it before `agent.spawn` (evidence of task 4.2).
// Each handler calls `next` with no step before it that can throw, so it has no catch-all (D49).

import type { MatchedHook } from "claude-code";
import type { Handler } from "../../../kernel/slice.ts";

export const DEFAULT_AGENT = "claudetto:worker";
const MAIN_AGENT = "claudetto:main";

export const onOffer: Handler<"agent.offer"> = async (_$, e, next) =>
  e.provider.plugin === "engine" || e.agent === MAIN_AGENT
    ? { isOffered: false }
    : next(e);

/** The hook for `Agent`, with `e` narrowed to that tool by the filter in `hooks/register.ts`. */
type AgentCall = MatchedHook<
  "tool.call",
  { readonly tool: readonly ["Agent"] }
>;

export const onAgentCall: AgentCall = async (_$, e, next) =>
  next(e.subagent_type ? e : { ...e, subagent_type: DEFAULT_AGENT });
