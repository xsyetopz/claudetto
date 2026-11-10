import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "./secrets.mock.ts";

interface Seen {
	subagent_type?: string;
	run_in_background?: boolean;
}

// The stub stands for the engine's Agent tool: it records the call it receives.
const lab = (on: On): Seen[] => {
	scanner(on);
	const seen: Seen[] = [];
	on("clock.now", () => ({ value: 0 }));
	on("tool.call", { tool: "Agent" }, (_$, e) => {
		seen.push({
			...(e.subagent_type === undefined
				? {}
				: { subagent_type: e.subagent_type }),
			...(e.run_in_background === undefined
				? {}
				: { run_in_background: e.run_in_background }),
		});
		return {
			result: { agentId: "a1", content: [], agentType: e.subagent_type },
		};
	});
	return seen;
};

const call = (subagent_type?: string, run_in_background?: boolean) => ({
	tool: "Agent" as const,
	description: "d",
	prompt: "p",
	...(subagent_type === undefined ? {} : { subagent_type }),
	...(run_in_background === undefined ? {} : { run_in_background }),
});

const H = 'subagent_type "claudetto:Heracles"';
const refused: [string | undefined, boolean | undefined, string][] = [
	[undefined, undefined, H],
	["", undefined, H],
	["general-purpose", undefined, H],
	["claude", undefined, H],
	["Heracles", undefined, H],
	["Explore", false, 'subagent_type "claudetto:Artemis".'],
	["Plan", false, 'subagent_type "claudetto:Metis".'],
	[
		"Explore",
		undefined,
		'subagent_type "claudetto:Artemis" with run_in_background: false',
	],
	["Artemis", true, 'subagent_type "claudetto:Artemis"'],
	[
		"claudetto:Artemis",
		undefined,
		'subagent_type "claudetto:Artemis" with run_in_background: false',
	],
	[
		"claudetto:Metis",
		undefined,
		'subagent_type "claudetto:Metis" with run_in_background: false',
	],
];

for (const [type, background, form] of refused) {
	test(`a call typed ${JSON.stringify(type)} is refused with its exact form, never rewritten`, async ($: Engine, on: On) => {
		const seen = lab(on);

		const out = await $.tool.call(call(type, background));

		expect(seen).toEqual([]);
		expect(out.deny).toContain(form);
	});
}

test("a call in the exact form reaches the engine as it was", async ($: Engine, on: On) => {
	const seen = lab(on);

	await $.tool.call(call("claudetto:Artemis", true));
	await $.tool.call(call("claudetto:Artemis", false));
	await $.tool.call(call("claudetto:Heracles"));

	expect(seen).toEqual([
		{ subagent_type: "claudetto:Artemis", run_in_background: true },
		{ subagent_type: "claudetto:Artemis", run_in_background: false },
		{ subagent_type: "claudetto:Heracles" },
	]);
});

for (const type of ["fork", "statusline-setup", "claude-code-guide"]) {
	test(`${type} passes through unchanged`, async ($: Engine, on: On) => {
		const seen = lab(on);

		await $.tool.call(call(type));

		expect(seen).toEqual([{ subagent_type: type }]);
	});
}

test("the result of an Artemis call reads as Explore", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call(call("claudetto:Artemis", false));

	expect(out.result).toMatchObject({ agentType: "Explore" });
});

test("the result of a Heracles call keeps its agent type", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.tool.call(call("claudetto:Heracles"));

	expect(out.result).toMatchObject({ agentType: "claudetto:Heracles" });
});

test("agent.offer withholds a built-in agent and offers a plugin one", async ($: Engine, on: On) => {
	on("agent.offer", () => ({ isOffered: true }));
	const origin = { plugin: "engine", tier: "core" } as const;

	const builtIn = await $.agent.offer({
		agent: "Explore",
		description: "d",
		source: "built-in",
		provider: origin,
	});
	const plugin = await $.agent.offer({
		agent: "claudetto:Artemis",
		description: "d",
		source: "plugin",
		provider: { plugin: "claudetto", tier: "user" },
	});

	expect(builtIn.isOffered).toBe(false);
	expect(plugin.isOffered).toBe(true);
});

test("the Agent text picks a type from the agent list or leaves the work to the caller", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe({
		tool: "Agent",
		description: "Launch a new agent (general-purpose by default)",
		provider: { plugin: "engine", tier: "core" },
	});

	expect(out.description).not.toContain("general-purpose");
	expect(out.description).toContain("claudetto:Artemis");
	expect(out.description).toContain("claudetto:Metis");
	expect(out.description).toContain("claudetto:Heracles");
	expect(out.description).toContain("run_in_background: false");
	// A spawn result already gives the agentId SendMessage takes (task 18.24).
	expect(out.description).not.toContain("`name`");
	expect(out.description).toContain("Do a few tool calls yourself instead");
});

test("A Delegated Edit Comes Back with Its Check: the Agent text sends the check command and runs it on the report", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe({
		tool: "Agent",
		description: "Launch a new agent",
		provider: { plugin: "engine", tier: "core" },
	});

	expect(out.description).toContain(
		"Give an edit task the command that checks it, and run that command when the report arrives, before you build on it.",
	);
});

const LISTING = [
	"Available agent types for the Agent tool:",
	"- claudetto:Artemis: search",
	"- claudetto:Heracles: default",
	"",
	"Use subagent_type.",
].join("\n");

test("the listing keeps only its agent lines", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "agent_listing_delta",
		text: LISTING,
		origin: { kind: "engine" },
	});

	expect(out.text).toBe(
		"- claudetto:Artemis: search\n- claudetto:Heracles: default",
	);
});

test("another attachment is left as it is", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "skill_listing",
		text: LISTING,
		origin: { kind: "engine" },
	});

	expect(out.text).toBe(LISTING);
});

const ASK = "mcp__claudetto__ask-user-question";
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

test("the model's own AskUserQuestion call is denied with the way out", async ($: Engine, on: On) => {
	stockAsk(on);
	await bind($, on);

	const out = await $.tool.call({ tool: "AskUserQuestion", questions: [] });

	expect(out.deny).toBe(
		"AskUserQuestion is off here: call mcp__claudetto__ask-user-question with question and options.",
	);
});

test("ask calls the stock tool with its options and multiSelect", async ($: Engine, on: On) => {
	const seen = stockAsk(on);
	await bind($, on);

	const out = await $.tool.call({
		tool: ASK,
		question: "Which?",
		options: ["Alpha", "Beta"],
		multiSelect: true,
	});

	expect(out.result).toBe("The user answered: Alpha");
	expect(JSON.stringify(seen)).toContain('"multiSelect":true');
	expect(JSON.stringify(seen)).toContain("Beta");
});

test("after ask returns, the stock tool is denied again", async ($: Engine, on: On) => {
	stockAsk(on);
	await bind($, on);
	await $.tool.call({ tool: ASK, question: "Which?", options: ["A", "B"] });

	const out = await $.tool.call({ tool: "AskUserQuestion", questions: [] });

	expect(out.deny).toContain("AskUserQuestion is off here");
});

test("a refused ask comes back as text, not a throw", async ($: Engine, on: On) => {
	on("tool.call", { tool: "AskUserQuestion" }, () => ({ deny: "dismissed" }));
	await bind($, on);

	const out = await $.tool.call({
		tool: ASK,
		question: "Which?",
		options: ["A", "B"],
	});

	expect(out.result).toContain("ask failed");
});

// With no ToolSearch to load them, a deferral flag set after the first request rewrites the cache (18.26).
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

test("the stock AskUserQuestion and Monitor go behind ToolSearch", async ($: Engine, on: On) => {
	for (const out of await describeStock($, on, ["Read", "ToolSearch"])) {
		expect(out.isDeferred).toBe(true);
		expect(out.description).toBe("stock");
	}
});

test("the stock AskUserQuestion and Monitor stay in the list when the session has no ToolSearch", async ($: Engine, on: On) => {
	for (const out of await describeStock($, on, ["Read", "AskUserQuestion"])) {
		expect(out.isDeferred).toBeUndefined();
		expect(out.description).toBe("stock");
	}
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

	expect(out.deny).toBe("Monitor is off here: call mcp__claudetto__monitor.");
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

	expect(queries.sort((a, b) => a.localeCompare(b))).toEqual(
		[...sent].sort((a, b) => a.localeCompare(b)),
	);
});

test("a query that names AskUserQuestion gets the wrapper in its result", async ($: Engine, on: On) => {
	stockSearch(on, ["AskUserQuestion"]);

	const out = await $.tool.call(search("select:AskUserQuestion"));

	expect(out.result).toMatchObject({ matches: [ASK] });
});

test("a result that lists the stock ask lists the wrapper once", async ($: Engine, on: On) => {
	stockSearch(on, ["AskUserQuestion", ASK]);

	const out = await $.tool.call(search("ask the user"));

	expect(out.result).toMatchObject({ matches: [ASK] });
});
