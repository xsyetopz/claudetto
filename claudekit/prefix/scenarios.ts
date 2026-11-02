// The mid-session events whose effect on the request prefix a run measures.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PLUGIN_DIR } from "../plugin.ts";
import type { Scenario } from "./session.ts";

const turn = (text: string) => ({ text });
const command = (text: string) => ({ text, expect: false });
const key = (...keys: string[]) => ({ keys, expect: false });

const probeServer = (tools: number): string =>
	JSON.stringify({
		mcpServers: {
			probe: {
				command: "bun",
				args: [join(import.meta.dir, "mcp-server.ts")],
				env: { N: String(tools) },
			},
		},
	});

const mcpArgs = (tools: number): string[] => [
	"--mcp-config",
	probeServer(tools),
	"--strict-mcp-config",
];

const readAndEdit = [
	{ name: "Read", input: { file_path: "WORK/a.txt" } },
	{
		name: "Edit",
		input: { file_path: "WORK/a.txt", old_string: "one", new_string: "two" },
	},
];

/** The fake's tool calls name a file in the working folder, which exists only once the run has made it. */
const withFile = (scenario: Scenario): Scenario => ({
	...scenario,
	calls: readAndEdit.map((call) => ({ ...call })),
	setup: async (folders) => {
		await writeFile(join(folders.work, "a.txt"), "one\n");
		for (const call of scenario.calls ?? []) {
			const input: Record<string, unknown> = call.input;
			input["file_path"] = String(input["file_path"]).replace(
				"WORK",
				folders.work,
			);
		}
	},
});

const writeSkillAndCommand = async (
	work: string,
	skill: string,
	description: string,
	commandName: string,
	commandText: string,
): Promise<void> => {
	await mkdir(join(work, `.claude/skills/${skill}`), { recursive: true });
	await mkdir(join(work, ".claude/commands"), { recursive: true });
	await writeFile(
		join(work, `.claude/skills/${skill}/SKILL.md`),
		`---
name: ${skill}
description: ${description}
---
body
`,
	);
	await writeFile(
		join(work, `.claude/commands/${commandName}.md`),
		`${commandText}
`,
	);
};

export const SCENARIOS: Readonly<Record<string, Scenario>> = {
	baseline: { steps: [turn("hi"), turn("again"), turn("third")] },
	model: {
		steps: [
			turn("hi"),
			command("/model claude-haiku-5-5"),
			turn("next"),
			turn("more"),
		],
	},
	effort: { steps: [turn("hi"), command("/effort low"), turn("next")] },
	"permission-mode": {
		steps: [turn("hi"), key("BTab"), turn("next"), key("BTab"), turn("more")],
	},
	"no-caching": {
		env: { DISABLE_PROMPT_CACHING: "1" },
		steps: [turn("hi"), turn("next")],
	},
	opusplan: {
		args: ["--model", "opusplan", "--permission-mode", "default"],
		steps: [turn("hi"), key("BTab"), turn("two"), key("BTab"), turn("three")],
	},
	"mcp-search-off": {
		args: mcpArgs(3),
		env: { ENABLE_TOOL_SEARCH: "false" },
		steps: [
			turn("hi"),
			command("/mcp disable probe"),
			turn("next"),
			command("/mcp enable probe"),
			turn("more"),
		],
	},
	"mcp-search-on": {
		args: mcpArgs(60),
		steps: [
			turn("hi"),
			command("/mcp disable probe"),
			turn("next"),
			command("/mcp enable probe"),
			turn("more"),
		],
	},
	"output-style": {
		steps: [turn("hi"), command("/output-style Explanatory"), turn("next")],
	},
	skill: {
		setup: ({ work }) =>
			writeSkillAndCommand(work, "first", "Present at start", "old", "old"),
		steps: [
			turn("hi"),
			{
				before: ({ work }) =>
					writeSkillAndCommand(
						work,
						"added",
						"Added mid-session",
						"added-command",
						"Say hello",
					),
				text: "/added-command",
			},
			turn("more"),
		],
	},
	compact: {
		steps: [
			turn("first prompt"),
			turn("second prompt"),
			turn("/compact"),
			turn("after compact"),
		],
	},
	rewind: {
		steps: [
			turn("first prompt"),
			turn("second prompt"),
			turn("third prompt"),
			key("Escape", "Escape"),
			key("Up", "Up", "Enter"),
			key("Enter"),
			turn("fourth prompt"),
		],
	},
	subagent: {
		args: ["--permission-mode", "acceptEdits"],
		calls: [
			{
				name: "Agent",
				input: {
					description: "probe",
					prompt: "say hi",
					subagent_type: "general-purpose",
				},
			},
		],
		steps: [turn("spawn it"), turn("next")],
	},
	"file-edit": withFile({
		args: ["--permission-mode", "acceptEdits"],
		steps: [turn("edit a.txt"), turn("next"), turn("more")],
	}),
	claudetto: {
		args: ["--plugin-dir", PLUGIN_DIR, "--permission-mode", "acceptEdits"],
		steps: [
			turn("first"),
			turn("second"),
			key("BTab"),
			turn("third"),
			turn("fourth"),
		],
	},
};
