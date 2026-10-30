// `Grep` and `Glob` are offered only where `Bash` is absent, so naming them beside `Bash` is a fault.
// Usage: bun tools/agent-tools.ts

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { AGENT_ROSTER } from "../plugins/claudetto/src/blocks/tool-describe/texts.ts";

export const TOOL_NAMES = [
	"Read",
	"Edit",
	"Write",
	"Grep",
	"Glob",
	"Bash",
	"Monitor",
	"WebFetch",
	"WebSearch",
] as const;

/** The names the runtime offers in place of `Bash` when it is denied. */
export const SWAPPED_FOR_BASH: readonly string[] = ["Grep", "Glob"];

export interface Agent {
	readonly file: string;
	readonly tools: readonly string[] | null;
	readonly body: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export const parseAgent = (file: string, text: string): Agent => {
	const parts = FRONTMATTER.exec(text);
	const head = parts?.[1] ?? "";
	const line = head.split("\n").find((l) => l.startsWith("tools:"));
	const tools =
		line === undefined
			? null
			: line
					.slice("tools:".length)
					.split(",")
					.map((name) => name.trim())
					.filter((name) => name !== "");
	return { file, tools, body: parts?.[2] ?? text };
};

export const withheldBy = (tools: readonly string[]): string[] =>
	tools.includes("Bash")
		? tools.filter((name) => SWAPPED_FOR_BASH.includes(name))
		: [];

export const bodyNamesWithheld = (agent: Agent): string[] =>
	TOOL_NAMES.filter(
		(name) =>
			agent.tools !== null &&
			!agent.tools.includes(name) &&
			new RegExp(`\\b${name}\\b`).test(agent.body),
	);

export const agentFaults = (agents: readonly Agent[]): string[] =>
	agents.flatMap((agent) => {
		const lines: string[] = [];
		const held = withheldBy(agent.tools ?? []);
		if (held.length > 0) {
			lines.push(
				`${agent.file}: declares ${held.join(" and ")} beside Bash, and the runtime withholds them from an agent that has Bash`,
			);
		}
		const named = bodyNamesWithheld(agent);
		if (named.length > 0) {
			lines.push(
				`${agent.file}: the body names ${named.join(" and ")}, which the tools line does not declare`,
			);
		}
		return lines;
	});

export const AGENTS_DIR = "plugins/claudetto/agents";

const MAIN = "main";

export const agentName = (agent: Agent): string =>
	agent.file.slice(AGENTS_DIR.length + 1, -".md".length);

const TOOL_SET: readonly string[] = TOOL_NAMES;

/** Tools are excluded so that the text may name one, as in "it has no `Bash`". */
export const rosterNames = (text: string): string[] => [
	...new Set(
		[...text.matchAll(/`([A-Z][A-Za-z]+)`/g)]
			.map((match) => match[1] ?? "")
			.filter((name) => !TOOL_SET.includes(name)),
	),
];

/** `main` is the thread's own body, never a delegation target, so it is left out both ways. */
export const rosterFaults = (
	text: string,
	agents: readonly Agent[],
): string[] => {
	const shipped = agents.map(agentName).filter((name) => name !== MAIN);
	const named = rosterNames(text);
	return [
		...named
			.filter((name) => !shipped.includes(name))
			.map(
				(name) =>
					`the delegation text names ${name}, and no file of ${AGENTS_DIR}/ ships it`,
			),
		...shipped
			.filter((name) => !named.includes(name))
			.map((name) => `${name} ships, and the delegation text never names it`),
	];
};

export const readAgents = async (root: string): Promise<Agent[]> => {
	const names = (await readdir(join(root, AGENTS_DIR)))
		.filter((name) => name.endsWith(".md"))
		.sort((a, b) => a.localeCompare(b));
	return Promise.all(
		names.map(async (name) =>
			parseAgent(
				`${AGENTS_DIR}/${name}`,
				await readFile(join(root, AGENTS_DIR, name), "utf8"),
			),
		),
	);
};

if (import.meta.main) {
	const agents = await readAgents(join(import.meta.dir, ".."));
	const lines = [...agentFaults(agents), ...rosterFaults(AGENT_ROSTER, agents)];
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
