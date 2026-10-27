// The mod handlers of the `agents` slice (D2 of change `0-3-0`).
// `agent.offer` hides each built-in agent and `claudetto:main`, so the model sees only the plugin agents that it can start.
// `tool.call` gives an `Agent` call with no `subagent_type` the type `claudetto:Hephaestus`, before the permission step treats it as `general-purpose` and refuses it (task 4.2).
// Each handler calls `next` first with no step before it that can throw, so it has no catch-all (D49).

import type { MatchedHook } from "claude-code";
import type { Handler } from "../../../kernel/hooks.ts";

const DEFAULT_AGENT = "claudetto:Hephaestus";
const MAIN_AGENT = "claudetto:main";

export const onOffer: Handler<"agent.offer"> = async (_$, e, next) =>
	e.provider.plugin === "engine" || e.agent === MAIN_AGENT
		? { isOffered: false }
		: next(e);

type AgentCall = MatchedHook<
	"tool.call",
	{ readonly tool: readonly ["Agent"] }
>;

export const onAgentCall: AgentCall = async (_$, e, next) =>
	next(e.subagent_type ? e : { ...e, subagent_type: DEFAULT_AGENT });
