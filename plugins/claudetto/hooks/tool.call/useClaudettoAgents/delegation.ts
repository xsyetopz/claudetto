import type { On } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain";
import { deferral } from "../../settings.read/useSlimSurface/surface";
import { AGENT_TEXT, agentForm, ASK_TEXT } from "../../texts";

const PREFIX = "claudetto:";

const TYPES: ReadonlyMap<string, string> = new Map([
	["Explore", "search"],
	["Plan", "plan"],
	["general-purpose", "work"],
	["claude", "work"],
	["search", "search"],
	["plan", "plan"],
	["sweep", "sweep"],
	["work", "work"],
]);

// search, plan, and sweep return one report; a plugin agent otherwise runs in the background.
const ONE_SHOT: ReadonlySet<string> = new Set(["search", "plan", "sweep"]);

// The claudetto agent that serves a call's `subagent_type`; undefined for `fork` and for a type claudetto does not own.
const agentFor = (type: string | undefined): string | undefined => {
	if (type === undefined || type === "") {
		return "work";
	}
	return TYPES.get(type.startsWith(PREFIX) ? type.slice(PREFIX.length) : type);
};

const qualified = (agent: string): string => PREFIX + agent;

type Call<T extends CallEvent["tool"]> = Extract<CallEvent, { tool: T }>;

// A rewritten input voids auto mode's server review of every call in the response, so an off call is refused with its exact form, never changed.
async function agentCall(
	e: Call<"Agent">,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	const agent = agentFor(e.subagent_type);
	if (agent === undefined) {
		return next(e);
	}
	const oneShot = ONE_SHOT.has(agent);
	const type = qualified(agent);
	const foreground = oneShot && e.run_in_background === undefined;
	if (e.subagent_type !== type || foreground) {
		return { deny: agentForm(type, foreground) };
	}
	const out = await next(e);
	return oneShot && !out.isError && out.result !== undefined
		? { ...out, result: { ...out.result, agentType: "Explore" } }
		: out;
}

/** Delegates an `Agent` call to claudetto's agents; every other tool passes on. */
export function delegationCall(e: CallEvent, next: CallNext): CallAnswer {
	return e.tool === "Agent" ? agentCall(e, next) : next(e);
}

const agentHooks = (on: On): void => {
	on("agent.offer", (_$, e, next) =>
		e.source === "built-in" ? { isOffered: false } : next(e),
	);

	on("tool.describe", { tool: "Agent" }, async (_$, e, next) => ({
		...(await next(e)),
		description: AGENT_TEXT,
	}));
};

const listingHook = (on: On): void => {
	// The listing's header and footer cost bytes the agent lines do not.
	on(
		"prompt.attachment",
		{ type: "agent_listing_delta" },
		async (_$, e, next) => {
			const out = await next(e);
			return out.text === null
				? out
				: {
						text: out.text
							.split("\n")
							.filter((line) => line.startsWith("- "))
							.join("\n"),
					};
		},
	);
};

const searchHooks = (on: On): void => {
	// Auto mode reads a popup answer only from this tool, so the model calls it and only its description is cut.
	on("tool.describe", { tool: "AskUserQuestion" }, async ($, e, next) => ({
		...(await next(e)),
		description: ASK_TEXT,
		...deferral(await $.tool.list()),
	}));
};

export const delegation = (on: On): void => {
	agentHooks(on);
	listingHook(on);
	searchHooks(on);
};
