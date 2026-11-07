import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import {
	DEFERRED_TOOLS,
	OFF_COMMANDS,
	OFF_SKILLS,
	skillOverridesFor,
} from "./surface.ts";
import {
	BUN_FACT,
	INTERVIEW_TEXT,
	planModeText,
	ROOT_PROMPT,
	TOOL_TEXTS,
} from "./texts.ts";

const bytes = (text: string): number => new TextEncoder().encode(text).length;

test("the root prompt is one shared section within 5,218 bytes", async ($: Engine, on: On) => {
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
	expect(bytes(ROOT_PROMPT)).toBeLessThanOrEqual(5218);
});

test("the /init interview fits 1,144 chars, names the claudetto ask-user-question tool, and no deleted file", () => {
	expect(INTERVIEW_TEXT.length).toBeLessThanOrEqual(1144);
	expect(INTERVIEW_TEXT).toContain("mcp__claudetto__ask-user-question");
	expect(INTERVIEW_TEXT).not.toContain("AskUserQuestion");
	expect(INTERVIEW_TEXT).not.toContain("AGENTS.md");
});

test("the ListAgents text is 304 chars", () => {
	expect(TOOL_TEXTS["ListAgents"]?.length).toBe(304);
});

for (const tool of Object.keys(TOOL_TEXTS)) {
	test(`tool.describe sends our ${tool} text, deferred only for Read, Write, Skill among them`, async ($: Engine, on: On) => {
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "x".repeat(3000),
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out.description).toBe(TOOL_TEXTS[tool] ?? "");
		expect(out.isDeferred === true).toBe(DEFERRED_TOOLS.includes(tool));
	});
}

for (const tool of ["Workflow", "ScheduleWakeup", "ReportFindings"]) {
	test(`${tool} goes behind ToolSearch with its stock text`, async ($: Engine, on: On) => {
		on("tool.describe", (_$, e) => e);
		const out = await $.tool.describe({
			tool,
			description: "stock",
			provider: { plugin: "engine", tier: "core" },
		});
		expect(out).toMatchObject({ description: "stock", isDeferred: true });
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
		expect(run.text).toBe(`claudetto: /${name} is off in claudetto.`);
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
	on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
	on("clock.now", () => ({ value: 0 }));
	const denied = await $.tool.call({
		tool: "Read",
		file_path: "/r/bun.lock",
	});
	expect(denied.deny).toContain("`limit`");
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
		on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
		on("clock.now", () => ({ value: 0 }));

		const out = await $.tool.call({ tool: "Read", file_path: path });

		expect(out.deny).toContain("`limit`");
	});
}

test("Rule K: the 18 prompt commands go off, but not a name a user skill holds", () => {
	const overrides = skillOverridesFor(new Set(["debug"]));
	expect(Object.keys(overrides)).toEqual(
		OFF_SKILLS.filter((n) => n !== "debug"),
	);
	expect(OFF_SKILLS.length).toBe(18);
	expect(Object.values(overrides).every((v) => v === "off")).toBe(true);
});

const ENGINE = { kind: "engine" } as const;
const LONG_REMINDER = "stock plan mode text ".repeat(300);

const planAttachment = async (
	$: Engine,
	on: On,
	text: string,
	detail?: { reminder: "full" | "sparse"; hasPlan: boolean },
) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));
	const out = await $.prompt.attachment({
		type: "plan_mode",
		text,
		origin: ENGINE,
		...(detail === undefined
			? {}
			: { detail: { ...detail, planFilePath: "/plans/a.md" } }),
	});
	return out.text;
};

test("the full plan mode reminder is replaced by a shorter one naming the plan file", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe(planModeText("/plans/a.md", false));
	expect(text?.length).toBeLessThan(LONG_REMINDER.length);
});

test("a plan file that already holds a plan is read before it is edited", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "full",
		hasPlan: true,
	});

	expect(text).toContain("/plans/a.md. It already holds a plan: read it");
});

test("the sparse reminder is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER, {
		reminder: "sparse",
		hasPlan: false,
	});

	expect(text).toBe(LONG_REMINDER);
});

test("an engine plan mode text shorter than ours is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, "Plan.", {
		reminder: "full",
		hasPlan: false,
	});

	expect(text).toBe("Plan.");
});

test("a plan mode row without its facts is kept", async ($: Engine, on: On) => {
	const text = await planAttachment($, on, LONG_REMINDER);

	expect(text).toBe(LONG_REMINDER);
});

test("another attachment is passed on unchanged", async ($: Engine, on: On) => {
	on("prompt.attachment", (_$, e) => ({ text: e.text }));

	const out = await $.prompt.attachment({
		type: "skill_listing",
		text: LONG_REMINDER,
		origin: ENGINE,
	});

	expect(out.text).toBe(LONG_REMINDER);
});

const skillText = async ($: Engine, on: On, skill: string, source: string) => {
	on("skill.prompt", (_$, e) => e);
	const out = await $.skill.prompt({
		skill,
		text: "stock text",
		source: source === "built-in" ? "built-in" : "user",
	});
	return out.text;
};

test("the built-in init skill reaches the model as the interview", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "built-in")).toBe(INTERVIEW_TEXT);
});

test("a user's own skill named init keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "init", "user")).toBe("stock text");
});

test("another built-in skill keeps its text", async ($: Engine, on: On) => {
	expect(await skillText($, on, "review", "built-in")).toBe("stock text");
});

test("a Read of a source file goes on", async ($: Engine, on: On) => {
	on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
	on("clock.now", () => ({ value: 0 }));

	const out = await $.tool.call({ tool: "Read", file_path: "/r/main.ts" });

	expect(out.result).toBe("read");
});

test(
	"with readGuardEnabled off, a whole Read of a lock file goes on",
	{ options: { readGuardEnabled: false } },
	async ($: Engine, on: On) => {
		on("tool.call", { tool: "Read" }, () => ({ result: "read" }));
		on("clock.now", () => ({ value: 0 }));

		const out = await $.tool.call({ tool: "Read", file_path: "/r/bun.lock" });

		expect(out.result).toBe("read");
	},
);

test("the root prompt opens on its role and holds no agent frontmatter", () => {
	expect(ROOT_PROMPT.trimStart().startsWith("<role>")).toBe(true);
	expect(ROOT_PROMPT).not.toContain("\n---\n");
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

	expect((await describe()).description).toBe((await describe()).description);
});

/** The stubs a SessionStart needs beneath the whole plugin. */
const startLab = (on: On, files: readonly string[]) => {
	mock.store(on, {});
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: {
			version: "2.1.318",
			base: "2.1.318",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("env.get", () => ({ value: undefined }));
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/repo" }));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", (_$, e) => ({ value: files.includes(e.path) }));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
};

const bunContext = async ($: Engine, source: "startup" | "clear" | "compact") =>
	(await $.classic.SessionStart({ source, cwd: "/repo" })).additionalContext ??
	[];

const BUN_FILES = ["/repo/package.json", "/repo/bun.lock"];

test("a folder with package.json and bun.lock adds the bun text, again after clear and compact", async ($: Engine, on: On) => {
	startLab(on, BUN_FILES);

	expect(await bunContext($, "startup")).toContain(BUN_FACT);
	expect(await bunContext($, "clear")).toContain(BUN_FACT);
	expect(await bunContext($, "compact")).toContain(BUN_FACT);
});

for (const files of [["/repo/package.json"], ["/repo/bun.lock"]]) {
	test(`a folder with only ${files[0]?.slice(6)} adds nothing`, async ($: Engine, on: On) => {
		startLab(on, files);

		expect(await bunContext($, "startup")).not.toContain(BUN_FACT);
	});
}

test(
	"with bunRuleEnabled off, nothing is added",
	{ options: { bunRuleEnabled: false } },
	async ($: Engine, on: On) => {
		startLab(on, BUN_FILES);

		expect(await bunContext($, "startup")).not.toContain(BUN_FACT);
	},
);
