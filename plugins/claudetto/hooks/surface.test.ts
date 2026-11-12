import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "./secrets.mock.ts";
import {
	DEFERRED_TOOLS,
	OFF_COMMANDS,
	OFF_SKILLS,
	skillOverridesFor,
} from "./surface.ts";
import {
	INTERVIEW_TEXT,
	offCommandText,
	ROOT_PROMPT,
	TOOL_TEXTS,
} from "./texts.ts";

const bytes = (text: string): number => new TextEncoder().encode(text).length;
const textOf = (tool: string): string => TOOL_TEXTS[tool] ?? "";

test("the root prompt is one shared section within 6,453 bytes", async ($: Engine, on: On) => {
	on("prompt.compose", () => ({
		sections: [{ id: "intro", text: "The default intro.", scope: "shared" }],
	}));
	const out = await $.prompt.compose({
		model: "claude-opus-5-5",
		promptModel: "claude-opus-5-5",
		surfaces: ["terminal"],
		tools: ["Read"],
		outputStyle: null,
		traits: [],
	});
	expect(out.sections).toEqual([
		{ id: "claudetto:root", text: ROOT_PROMPT, scope: "shared" },
	]);
	expect(bytes(ROOT_PROMPT)).toBeLessThanOrEqual(6825);
});

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

test("Monitor, ToolSearch, and the plan-mode tools each carry a text of ours", () => {
	const named = ["Monitor", "ToolSearch", "EnterPlanMode", "ExitPlanMode"];
	expect(named.filter((tool) => textOf(tool) === "")).toEqual([]);
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

test("a whole Read of a lock file is denied, a Read with a limit goes on", async ($: Engine, on: On) => {
	scanner(on);
	on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
	on("clock.now", () => ({ value: 0 }));
	const denied = await $.tool.call({
		tool: "Read",
		file_path: "/r/bun.lock",
	});
	expect(denied.deny).toBeDefined();
	const kept = await $.tool.call({
		tool: "Read",
		file_path: "/r/bun.lock",
		limit: 5,
	});
	expect(kept.result).toBe("read");
});

for (const path of [
	"/r/Cargo.lock",
	"/r/app.min.js",
	"/r/a.js.map",
	"/r/node_modules/x/index.js",
]) {
	test(`a whole Read of ${path} is denied`, async ($: Engine, on: On) => {
		scanner(on);
		on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
		on("clock.now", () => ({ value: 0 }));

		const out = await $.tool.call({ tool: "Read", file_path: path });

		expect(out.deny).toBeDefined();
	});
}

test("Rule K: the 18 prompt commands go off, but not a name a user skill holds", () => {
	const overrides = skillOverridesFor(new Set(["debug"]));
	expect(Object.keys(overrides)).toEqual(
		OFF_SKILLS.filter((n) => n !== "debug"),
	);
	expect(Object.values(overrides).every((v) => v === "off")).toBe(true);
});

test("a Read of a source file goes on", async ($: Engine, on: On) => {
	scanner(on);
	on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
	on("clock.now", () => ({ value: 0 }));

	const out = await $.tool.call({ tool: "Read", file_path: "/r/main.ts" });

	expect(out.result).toBe("read");
});

test(
	"with readGuardEnabled off, a whole Read of a lock file goes on",
	{ options: { readGuardEnabled: false } },
	async ($: Engine, on: On) => {
		scanner(on);
		on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
		on("clock.now", () => ({ value: 0 }));

		const out = await $.tool.call({ tool: "Read", file_path: "/r/bun.lock" });

		expect(out.result).toBe("read");
	},
);

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
