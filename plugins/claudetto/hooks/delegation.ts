import type { EngineInterface, On } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "./chain.ts";
import { deferral } from "./surface.ts";
import { AGENT_TEXT, agentForm, ASK_TEXT } from "./texts.ts";

const PREFIX = "claudetto:";

const TYPES: ReadonlyMap<string, string> = new Map([
	["Explore", "Artemis"],
	["Plan", "Metis"],
	["general-purpose", "Heracles"],
	["claude", "Heracles"],
	["Artemis", "Artemis"],
	["Metis", "Metis"],
	["Heracles", "Heracles"],
]);

// Artemis and Metis return one report; a plugin agent otherwise runs in the background.
const ONE_SHOT: ReadonlySet<string> = new Set(["Artemis", "Metis"]);

// The claudetto agent that serves a call's `subagent_type`; undefined for `fork` and for a type claudetto does not own.
const agentFor = (type: string | undefined): string | undefined => {
	if (type === undefined || type === "") {
		return "Heracles";
	}
	return TYPES.get(type.startsWith(PREFIX) ? type.slice(PREFIX.length) : type);
};

const qualified = (agent: string): string => PREFIX + agent;

const strings = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

const wsOf = (
	value: unknown,
): { url: string; protocols: string[] } | undefined =>
	typeof value === "object" &&
	value !== null &&
	"url" in value &&
	typeof value.url === "string"
		? {
				url: value.url,
				protocols: "protocols" in value ? strings(value.protocols) : [],
			}
		: undefined;

const text = (value: unknown): string =>
	typeof value === "string" ? value : "";

const WRAPPERS: ReadonlyMap<string, string> = new Map([
	["Monitor", "mcp__claudetto__monitor"],
]);

// The names a ToolSearch result lists, with a stock tool's claudetto wrapper in its place; undefined when nothing changes.
const wrapMatches = (matches: readonly string[]): string[] | undefined =>
	matches.some((name) => WRAPPERS.has(name))
		? [...new Set(matches.map((name) => WRAPPERS.get(name) ?? name))]
		: undefined;

// The stock Monitor answers only a call its wrapper makes, so the wrapper counts its calls in flight.
const running = { monitor: 0 };

const failure = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

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

async function monitorCall(
	$: EngineInterface,
	e: Call<"mcp__claudetto__monitor">,
): Promise<Awaited<CallAnswer>> {
	running.monitor++;
	try {
		const ws = wsOf(e.ws);
		const out = await $.tool.call({
			tool: "Monitor",
			description: text(e.description),
			timeout_ms: typeof e.timeout_ms === "number" ? e.timeout_ms : 300_000,
			...(ws === undefined ? { command: text(e.command) } : { ws }),
		});
		return { result: out.deny ?? out.text ?? "" };
	} catch (error) {
		return { result: `monitor failed: ${failure(error)}` };
	} finally {
		running.monitor--;
	}
}

function oldMonitorCall(e: Call<"Monitor">, next: CallNext): CallAnswer {
	return running.monitor > 0
		? next(e)
		: { deny: "Monitor is off here: call mcp__claudetto__monitor." };
}

// Only the result is rewritten: a rewritten query would void auto mode's server review of the response's other calls.
async function searchCall(
	e: Call<"ToolSearch">,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	const out = await next(e);
	const result = out.isError || out.deny !== undefined ? undefined : out.result;
	const matches = result && wrapMatches(result.matches);
	return result && matches ? { result: { ...result, matches } } : out;
}

/** Delegates `Agent`, `Monitor`, and `ToolSearch` calls to claudetto's agents and wrappers; every other tool passes on. */
export function delegationCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): CallAnswer {
	if (e.tool === "Agent") {
		return agentCall(e, next);
	}
	if (e.tool === "mcp__claudetto__monitor") {
		return monitorCall($, e);
	}
	if (e.tool === "Monitor") {
		return oldMonitorCall(e, next);
	}
	if (e.tool === "ToolSearch") {
		return searchCall(e, next);
	}
	return next(e);
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
	on("tool.describe", { tool: "Monitor" }, async ($, e, next) => ({
		...(await next(e)),
		...deferral(await $.tool.list()),
	}));

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
