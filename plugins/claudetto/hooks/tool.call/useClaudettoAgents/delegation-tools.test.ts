import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { haikuFailed } from "../../decider/decider.mock";
import { scanner } from "../../secrets.mock";
import { ASK_TEXT } from "../../texts";

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
	mock.env(on, {});
	on("model.complete", () => ({ value: haikuFailed("aborted") }));
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

	return $.tool.describe({
		tool: "AskUserQuestion",
		description: "stock",
		provider: { plugin: "engine", tier: "core" },
	});
};

test("AskUserQuestion gets the one-sentence description and goes behind ToolSearch", async ($: Engine, on: On) => {
	const ask = await describeStock($, on, ["Read", "ToolSearch"]);

	expect(ask).toMatchObject({ description: ASK_TEXT, isDeferred: true });
});

test("AskUserQuestion stays in the list when the session has no ToolSearch", async ($: Engine, on: On) => {
	const ask = await describeStock($, on, ["Read", "Monitor"]);

	expect(ask.description).toBe(ASK_TEXT);
	expect(ask.isDeferred).toBeUndefined();
});

test("the model's own Monitor call reaches the engine as sent", async ($: Engine, on: On) => {
	scanner(on);
	const seen: unknown[] = [];
	on("tool.call", { tool: "Monitor" }, (_$, e) => {
		seen.push({ command: e.command, ws: e.ws, timeout_ms: e.timeout_ms });
		return { result: { taskId: "t1", timeoutMs: e.timeout_ms } };
	});
	await bind($, on);

	const out = await $.tool.call({
		tool: "Monitor",
		description: "d",
		timeout_ms: 5000,
		ws: { url: "ws://127.0.0.1:1", protocols: ["p"] },
	});

	expect(out.deny).toBeUndefined();
	expect(seen).toEqual([
		{
			command: undefined,
			ws: { url: "ws://127.0.0.1:1", protocols: ["p"] },
			timeout_ms: 5000,
		},
	]);
	expect(out.result).toMatchObject({ taskId: "t1" });
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

test("a result that lists Monitor is returned as it came", async ($: Engine, on: On) => {
	stockSearch(on, ["Monitor", "Bash"]);

	const out = await $.tool.call(search("monitor"));

	expect(out.result).toMatchObject({ matches: ["Monitor", "Bash"] });
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
