// The scenarios of spec `agent-roster` that a file check can test (task 4.1 of change `0-3-0`).

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { SNIPPET } from "../../../plugins/claudetto/modules/setup/prompts.ts";
import { AGENTS, front, ROSTER, tools } from "../../support/agents.ts";

const PATTERN_1 = /^claude-(haiku|sonnet)-/;

const TOOLS = new Set([
	"Read",
	"Grep",
	"Glob",
	"Edit",
	"Write",
	"Bash",
	"Monitor",
	"WebSearch",
	"WebFetch",
]);

test("Agent Settings: each agent sets `model`, `effort`, `tools`, and `omitClaudeMd`", async () => {
	await Promise.all(
		ROSTER.map(async (name) => {
			const fm = await front(name);
			expect(fm, name).toMatchObject({ name, omitClaudeMd: true });
			expect(String(fm?.["model"]), name).toMatch(PATTERN_1);
			expect(["low", "medium", "high"], name).toContain(String(fm?.["effort"]));
			expect(String(fm?.["description"]), name).not.toContain("\n");
			for (const tool of await tools(name)) {
				expect(TOOLS, `${name}: ${tool}`).toContain(tool);
			}
		}),
	);
});

test("Read-Only Agent: each agent but `Hephaestus` cannot edit, write, or start an agent", async () => {
	const readOnly = ROSTER.filter((n) => n !== "Hephaestus");
	const lists = await Promise.all(readOnly.map((name) => tools(name)));
	for (const [i, list] of lists.entries()) {
		for (const tool of ["Edit", "Write", "Agent"]) {
			expect(list, readOnly[i]).not.toContain(tool);
		}
	}
});

test("Reviewer Effort: `Athena` has Sonnet 5.5 at `medium`", async () => {
	expect(await front("Athena")).toMatchObject({
		model: "claude-sonnet-5-5",
		effort: "medium",
	});
});

test("Haiku Work: only `Artemis` and `Apollo` run on Haiku 5.5, at `low`, with no web tool", async () => {
	const haiku: string[] = [];
	await Promise.all(
		ROSTER.map(async (name) => {
			const fm = await front(name);
			if (!String(fm?.["model"]).startsWith("claude-haiku-")) {
				return;
			}
			haiku.push(name);
			expect(fm?.["effort"], name).toBe("low");
			const list = await tools(name);
			for (const tool of ["WebSearch", "WebFetch"]) {
				expect(list, name).not.toContain(tool);
			}
		}),
	);
	expect(haiku.sort((a, b) => Number(a > b) - Number(a < b))).toStrictEqual([
		"Apollo",
		"Artemis",
	]);
});

// `readdir` gives the case on disk, which a lookup on a case-insensitive disk hides.
test("UpperCase Names: the files of `agents/` are `main.md` and the 6 agents of D6", async () => {
	expect((await readdir(AGENTS)).sort()).toStrictEqual([
		"Apollo.md",
		"Artemis.md",
		"Athena.md",
		"Hephaestus.md",
		"Hermes.md",
		"Zeus.md",
		"main.md",
	]);
});

test("Effort Is Not Forced: the snippet sets no env var that overrides the agents", () => {
	const keys = Object.keys(SNIPPET.env);
	expect(keys).not.toContain("CLAUDE_CODE_EFFORT_LEVEL");
	expect(keys).not.toContain("CLAUDE_CODE_SUBAGENT_MODEL_FORCE");
});
