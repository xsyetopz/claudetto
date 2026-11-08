import type { On } from "claude-code";
import { deferral } from "./surface.ts";
import { AGENT_TEXT } from "./texts.ts";

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

const SELECT = "select:";

const namesAsk = (token: string): boolean =>
	(token.startsWith("+") ? token.slice(1) : token).toLowerCase() ===
	OLD_ASK.toLowerCase();

// A query that names the stock ask tool goes to the claudetto one; any other query is returned as it came.
const askQuery = (query: string): string => {
	if (query.startsWith(SELECT)) {
		const names = query.slice(SELECT.length).split(",");
		return names.some((name) => namesAsk(name.trim()))
			? SELECT +
					names
						.map((name) => (namesAsk(name.trim()) ? NEW_ASK : name))
						.join(",")
			: query;
	}
	return query.split(" ").some(namesAsk) ? SELECT + NEW_ASK : query;
};

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

export const delegation = (on: On): void => {
	on("agent.offer", (_$, e, next) =>
		e.source === "built-in" ? { isOffered: false } : next(e),
	);

	on("tool.describe", { tool: "Agent" }, async (_$, e, next) => ({
		...(await next(e)),
		description: AGENT_TEXT,
	}));

	on("tool.call", { tool: "Agent" }, async (_$, e, next) => {
		if (e.subagent_type === "fork") {
			return next(e);
		}
		const agent = agentFor(e.subagent_type);
		if (agent === undefined) {
			return next(e);
		}
		const oneShot = ONE_SHOT.has(agent);
		const type = qualified(agent);
		const foreground = oneShot && e.run_in_background === undefined;
		const out = await next(
			e.subagent_type === type && !foreground
				? e
				: {
						...e,
						subagent_type: type,
						...(foreground ? { run_in_background: false } : {}),
					},
		);
		return oneShot && !out.isError && out.result !== undefined && !out.deny
			? { ...out, result: { ...out.result, agentType: "Explore" } }
			: out;
	});

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

	on(
		"tool.call",
		{ tool: "mcp__claudetto__ask-user-question" },
		async ($, e) => {
			running.ask++;
			try {
				const options = strings(e["options"]);
				const answer = await $.ui.ask(
					text(e["question"]),
					e["multiSelect"] === true ? { options, multiSelect: true } : options,
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

	on("tool.call", { tool: "mcp__claudetto__monitor" }, async ($, e) => {
		running.monitor++;
		try {
			const ws = wsOf(e["ws"]);
			const out = await $.tool.call({
				tool: "Monitor",
				description: text(e["description"]),
				timeout_ms:
					typeof e["timeout_ms"] === "number" ? e["timeout_ms"] : 300_000,
				...(ws === undefined ? { command: text(e["command"]) } : { ws }),
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

	on("tool.describe", { tool: [OLD_ASK, "Monitor"] }, async ($, e, next) => ({
		...(await next(e)),
		...deferral(await $.tool.list()),
	}));

	// The query is rewritten only when it names AskUserQuestion (a rewritten call sends the response's later calls to the local classifier in auto mode); the result is rewritten for every query.
	on("tool.call", { tool: "ToolSearch" }, async (_$, e, next) => {
		const query = askQuery(e.query);
		const out = await next(query === e.query ? e : { ...e, query });
		const result = out.isError || out.deny ? undefined : out.result;
		const matches = result && wrapMatches(result.matches);
		return result && matches ? { result: { ...result, matches } } : out;
	});
};
