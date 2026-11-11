import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "./secrets.mock.ts";
import { ASK_TEXT } from "./texts.ts";

const MONITOR = "mcp__claudetto__monitor";

const bind = async ($: Engine, on: On): Promise<void> => {
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => ({
		value: { tool: `mcp__claudetto__${e.name}` },
	}));
	on("fs.exists", () => ({ value: false }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("clock.now", () => ({ value: 0 }));
	await $.session.start({
		cwd: "/repo",
		surface: null,
		isInteractive: false,
	});
};

// The stub stands for the engine's AskUserQuestion: it answers the first option.
const stockAsk = (on: On): unknown[] => {
	scanner(on);
	const seen: unknown[] = [];
	on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => {
		seen.push(e.questions);
		const [first] = e.questions;
		return {
			result: {
				questions: e.questions,
				answers: { [first?.question ?? ""]: first?.options[0]?.label ?? "" },
			},
		};
	});
	return seen;
};

test("the model's own AskUserQuestion call reaches the dialog as sent", async ($: Engine, on: On) => {
	const seen = stockAsk(on);
	await bind($, on);
	const questions = [
		{
			question: "Which?",
			header: "Pick",
			multiSelect: false,
			options: [
				{ label: "Alpha", description: "The first" },
				{ label: "Beta", description: "The second" },
			],
		},
	];

	const out = await $.tool.call({ tool: "AskUserQuestion", questions });

	expect(out.deny).toBeUndefined();
	expect(seen).toEqual([questions]);
	expect(out.result).toMatchObject({ answers: { "Which?": "Alpha" } });
});

// With no ToolSearch to load them, a deferral flag set after the first request rewrites the cache.
const describeStock = ($: Engine, on: On, names: string[]) => {
	on("tool.list", () => ({
		value: names.map((name) => ({ name, description: "", mcp: false })),
	}));
	on("tool.describe", (_$, e) => e);
	const origin = { plugin: "engine", tier: "core" } as const;

	return Promise.all(
		["AskUserQuestion", "Monitor"].map((tool) =>
			$.tool.describe({ tool, description: "stock", provider: origin }),
		),
	);
};

test("AskUserQuestion gets the one-sentence description and goes behind ToolSearch", async ($: Engine, on: On) => {
	const [ask, monitor] = await describeStock($, on, ["Read", "ToolSearch"]);

	expect(ask).toMatchObject({ description: ASK_TEXT, isDeferred: true });
	expect(monitor).toMatchObject({ description: "stock", isDeferred: true });
});

test("AskUserQuestion stays in the list when the session has no ToolSearch", async ($: Engine, on: On) => {
	const [ask, monitor] = await describeStock($, on, ["Read", "Monitor"]);

	expect(ask?.description).toBe(ASK_TEXT);
	expect(ask?.isDeferred).toBeUndefined();
	expect(monitor?.description).toBe("stock");
	expect(monitor?.isDeferred).toBeUndefined();
});

test("the model's own Monitor call is denied with the way out", async ($: Engine, on: On) => {
	on("tool.call", { tool: "Monitor" }, () => ({
		result: { taskId: "t", timeoutMs: 1 },
	}));
	await bind($, on);

	const out = await $.tool.call({
		tool: "Monitor",
		description: "d",
		timeout_ms: 1000,
		command: "x",
	});

	expect(out.deny).toBeDefined();
});

test("monitor passes a command to the stock Monitor, whose text it returns", async ($: Engine, on: On) => {
	const seen: unknown[] = [];
	on("tool.call", { tool: "Monitor" }, (_$, e) => {
		seen.push({ command: e.command, ws: e.ws, timeout_ms: e.timeout_ms });
		return { result: { taskId: "t1", timeoutMs: e.timeout_ms } };
	});
	await bind($, on);

	const out = await $.tool.call({
		tool: MONITOR,
		description: "d",
		command: "tail -f x",
	});

	expect(seen).toEqual([
		{ command: "tail -f x", ws: undefined, timeout_ms: 300_000 },
	]);
	expect(out.deny).toBeUndefined();
	expect(typeof out.result).toBe("string");
});

test("monitor passes a ws source with its protocols", async ($: Engine, on: On) => {
	const seen: unknown[] = [];
	on("tool.call", { tool: "Monitor" }, (_$, e) => {
		seen.push({ command: e.command, ws: e.ws, timeout_ms: e.timeout_ms });
		return { result: { taskId: "t2", timeoutMs: e.timeout_ms } };
	});
	await bind($, on);

	await $.tool.call({
		tool: MONITOR,
		description: "d",
		ws: { url: "ws://127.0.0.1:1", protocols: ["p"] },
		timeout_ms: 5000,
	});

	expect(seen).toEqual([
		{
			command: undefined,
			ws: { url: "ws://127.0.0.1:1", protocols: ["p"] },
			timeout_ms: 5000,
		},
	]);
});

const search = (query: string) => ({
	tool: "ToolSearch" as const,
	query,
	max_results: 5,
});

// The stub stands for ToolSearch: it records the query and lists the names it was given.
const stockSearch = (on: On, matches: string[]): string[] => {
	scanner(on);
	const queries: string[] = [];
	on("clock.now", () => ({ value: 0 }));
	on("tool.call", { tool: "ToolSearch" }, (_$, e) => {
		queries.push(e.query);
		return { result: { matches, query: e.query, total_deferred_tools: 3 } };
	});
	return queries;
};

test("a keyword search that lists Monitor lists the wrapper instead", async ($: Engine, on: On) => {
	stockSearch(on, ["Monitor", "Bash"]);

	const out = await $.tool.call(search("monitor"));

	expect(out.result).toMatchObject({ matches: [MONITOR, "Bash"] });
});

test("a search that lists neither tool is returned as it came", async ($: Engine, on: On) => {
	stockSearch(on, ["Bash"]);

	const out = await $.tool.call(search("bash"));

	expect(out.result).toMatchObject({ matches: ["Bash"] });
});

test("a query reaches ToolSearch as it was, even one that names AskUserQuestion", async ($: Engine, on: On) => {
	const queries = stockSearch(on, ["Monitor"]);
	const sent = [
		"select:Monitor",
		"ask the user",
		"select:Read,askuserquestion",
		"+askuserquestion",
	];

	await Promise.all(sent.map((query) => $.tool.call(search(query))));

	expect(queries.toSorted((a, b) => a.localeCompare(b))).toEqual(
		[...sent].toSorted((a, b) => a.localeCompare(b)),
	);
});

test("a result that lists AskUserQuestion is returned as it came", async ($: Engine, on: On) => {
	stockSearch(on, ["AskUserQuestion"]);

	const out = await $.tool.call(search("select:AskUserQuestion"));

	expect(out.result).toMatchObject({ matches: ["AskUserQuestion"] });
});

test("a result that lists the stock Monitor and the wrapper lists the wrapper once", async ($: Engine, on: On) => {
	stockSearch(on, ["Monitor", MONITOR]);

	const out = await $.tool.call(search("monitor"));

	expect(out.result).toMatchObject({ matches: [MONITOR] });
});
