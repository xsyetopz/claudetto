import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { INTERVIEW_TEXT, offCommandText, TOOL_TEXTS } from "../../texts";
import {
	DEFERRED_TOOLS,
	OFF_COMMANDS,
	OFF_SKILLS,
	skillOverridesFor,
} from "./surface";

const textOf = (tool: string): string => TOOL_TEXTS[tool] ?? "";

test("the /init interview fits 1,144 chars", () => {
	expect(INTERVIEW_TEXT.length).toBeLessThanOrEqual(1144);
});

// The tools the session lists: `tool.describe` defers a tool only when ToolSearch is among them (18.26).
const listing = (on: On, names: string[]) =>
	on("tool.list", () => ({
		value: names.map((name) => ({ name, description: "", mcp: false })),
	}));

for (const tool of Object.keys(TOOL_TEXTS)) {
	test(`tool.describe sends our ${tool} text, deferred only for Skill among them`, async ($: Engine, on: On) => {
		listing(on, ["ToolSearch"]);
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "x".repeat(3000),
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out.description).toBe(textOf(tool));
		expect(out.isDeferred === true).toBe(DEFERRED_TOOLS.includes(tool));
	});
}

// Stock description lengths of Claude Code 2.1.322, read from a fake Messages API request.
const STOCK_TASK_LENGTHS: Record<string, number> = {
	TaskCreate: 2146,
	TaskGet: 732,
	TaskList: 998,
	TaskUpdate: 2243,
};
for (const [tool, stock] of Object.entries(STOCK_TASK_LENGTHS)) {
	test(`${tool} gets our text, shorter than the stock one`, async ($: Engine, on: On) => {
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "x".repeat(stock),
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out.description).toBe(textOf(tool));
		expect(textOf(tool).length).toBeLessThan(stock);
	});
}

test("Monitor, ToolSearch, and the plan-mode tools each carry a text of ours", () => {
	const named = ["Monitor", "ToolSearch", "EnterPlanMode", "ExitPlanMode"];
	expect(named.filter((tool) => textOf(tool) === "")).toEqual([]);
});

test("the Bash text says a background command re-invokes the model when it exits", () => {
	expect(textOf("Bash")).toContain("run_in_background");
	expect(textOf("Bash")).toContain("re-invokes you when it exits");
});

for (const tool of ["Workflow", "ScheduleWakeup", "ReportFindings"]) {
	test(`${tool} goes behind ToolSearch with its stock text`, async ($: Engine, on: On) => {
		listing(on, ["ToolSearch"]);
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "stock",
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out).toMatchObject({ description: "stock", isDeferred: true });
	});
}

for (const tool of DEFERRED_TOOLS) {
	test(`${tool} stays in the list when the session has no ToolSearch`, async ($: Engine, on: On) => {
		listing(on, ["Read", "Write"]);
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "stock",
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out.isDeferred).toBeUndefined();
	});
}

test("a stock description shorter than ours is kept", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);
	const out = await $.tool.describe({
		tool: "Bash",
		description: "short",
		provider: { plugin: "engine", tier: "core" },
	});
	expect(out.description).toBe("short");
});

for (const name of OFF_COMMANDS) {
	test(`/${name} is off and hidden`, async ($: Engine, on: On) => {
		on("command.describe", (_$, e) => e);
		const run = await $.command.run({
			command: name,
			args: "",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 },
		});
		expect(run.text).toBe(offCommandText(name));
		const described = await $.command.describe({
			command: name,
			description: "d",
			isHidden: false,
			immediate: false,
			provider: { plugin: "engine", tier: "core" },
		});
		expect(described.isHidden).toBe(true);
	});
}

test("Rule K: the 18 prompt commands go off, but not a name a user skill holds", () => {
	const overrides = skillOverridesFor(new Set(["debug"]));
	expect(Object.keys(overrides)).toEqual(
		OFF_SKILLS.filter((n) => n !== "debug"),
	);
	expect(Object.values(overrides).every((v) => v === "off")).toBe(true);
});

test("a tool claudetto writes no text for is passed on unchanged", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe({
		tool: "Glob",
		description: "stock glob",
		provider: { plugin: "engine", tier: "core" },
	});

	expect(out.description).toBe("stock glob");
});

test("two builds of a tool text are byte-identical", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);
	const describe = () =>
		$.tool.describe({
			tool: "Bash",
			description: "x",
			provider: { plugin: "engine", tier: "core" },
		});

	const awaited2 = await describe();
	const awaited = await describe();
	expect(awaited.description).toBe(awaited2.description);
});
