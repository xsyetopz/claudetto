import type { On } from "claude-code";

import { deferral } from "./surface.ts";
import { AGENT_TEXT, agentForm } from "./texts.ts";

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

const OLD_ASK = "AskUserQuestion";
const NEW_ASK = "mcp__claudetto__ask-user-question";

const WRAPPERS: ReadonlyMap<string, string> = new Map([
	["Monitor", "mcp__claudetto__monitor"],
	[OLD_ASK, NEW_ASK],
]);

// The names a ToolSearch result lists, with a stock tool's claudetto wrapper in its place; undefined when nothing changes.
const wrapMatches = (matches: readonly string[]): string[] | undefined =>
	matches.some((name) => WRAPPERS.has(name))
		? [...new Set(matches.map((name) => WRAPPERS.get(name) ?? name))]
		: undefined;

// The stock tools answer only a call their wrapper makes, so each wrapper counts its calls in flight.
const running = { ask: 0, monitor: 0 };

const failure = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

const agentHooks = (on: On): void => {
	on("agent.offer", (_$, e, next) =>
		e.source === "built-in" ? { isOffered: false } : next(e),
	);

	on("tool.describe", { tool: "Agent" }, async (_$, e, next) => ({
		...(await next(e)),
		description: AGENT_TEXT,
	}));

	// A rewritten input voids auto mode's server review of every call in the response, so an off call is refused with its exact form, never changed.
	on("tool.call", { tool: "Agent" }, async (_$, e, next) => {
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
	});
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

const askHooks = (on: On): void => {
	on(
		"tool.call",
		{ tool: "mcp__claudetto__ask-user-question" },
		async ($, e) => {
			running.ask++;
			try {
				const options = strings(e.options);
				const answer = await $.ui.ask(
					text(e.question),
					e.multiSelect === true ? { options, multiSelect: true } : options,
				);
				return { result: `The user answered: ${answer}` };
			} catch (error) {
				return { result: `ask failed: ${failure(error)}` };
			} finally {
				running.ask--;
			}
		},
	);

	on("tool.call", { tool: "AskUserQuestion" }, (_$, e, next) =>
		running.ask > 0
			? next(e)
			: {
					deny: "AskUserQuestion is off here: call mcp__claudetto__ask-user-question with question and options.",
				},
	);
};

const monitorHooks = (on: On): void => {
	on("tool.call", { tool: "mcp__claudetto__monitor" }, async ($, e) => {
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
	});

	on("tool.call", { tool: "Monitor" }, (_$, e, next) =>
		running.monitor > 0
			? next(e)
			: { deny: "Monitor is off here: call mcp__claudetto__monitor." },
	);
};

const searchHooks = (on: On): void => {
	on("tool.describe", { tool: [OLD_ASK, "Monitor"] }, async ($, e, next) => ({
		...(await next(e)),
		...deferral(await $.tool.list()),
	}));

	// Only the result is rewritten: a rewritten query would void auto mode's server review of the response's other calls.
	on("tool.call", { tool: "ToolSearch" }, async (_$, e, next) => {
		const out = await next(e);
		const result =
			out.isError || out.deny !== undefined ? undefined : out.result;
		const matches = result && wrapMatches(result.matches);
		return result && matches ? { result: { ...result, matches } } : out;
	});
};

export const delegation = (on: On): void => {
	agentHooks(on);
	listingHook(on);
	askHooks(on);
	monitorHooks(on);
	searchHooks(on);
};
