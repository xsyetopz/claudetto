// An agent file never declares a tool the runtime withholds from it. The program offers `Grep` and
// `Glob` only on a surface with no `Bash`, so a file that names `Bash` beside either declares a tool
// it never receives, and a body that names a tool the frontmatter leaves out promises one it lacks.
// The delegation text and the files also have to agree, so that neither a folded agent returns as a
// type nothing serves nor a shipped agent goes unnamed where the main loop picks one.
//
//   bun tools/agent-tools.ts

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { AGENT_ROSTER } from "../plugins/claudetto/src/tools/texts.ts";

/** The tools an agent file can name. A body word that is not in this list is not read as a tool. */
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

/**
 * The names that the runtime swaps for `Bash`: denying `Bash` is what puts them in its place, per the
 * comment above `NEVER_DENY` in `plugins/claudetto/src/deny.ts`.
 */
export const SWAPPED_FOR_BASH: readonly string[] = ["Grep", "Glob"];

/** One agent file of the plugin: its path, the tools its front matter lists, and the text after the front matter. */
export interface Agent {
	readonly file: string;
	/** `null` when the file has no `tools` line, which inherits every tool of the parent. */
	readonly tools: readonly string[] | null;
	readonly body: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

/** The declared tools and the body of one agent file. */
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

/** The declared names that the runtime withholds, which is `Grep` and `Glob` beside `Bash`. */
export const withheldBy = (tools: readonly string[]): string[] =>
	tools.includes("Bash")
		? tools.filter((name) => SWAPPED_FOR_BASH.includes(name))
		: [];

/** The tools that the body names, as a whole word, and the frontmatter does not declare. */
export const bodyNamesWithheld = (agent: Agent): string[] =>
	TOOL_NAMES.filter(
		(name) =>
			agent.tools !== null &&
			!agent.tools.includes(name) &&
			new RegExp(`\\b${name}\\b`).test(agent.body),
	);

/** One line per fault, naming the file and the tools. */
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

/** The folder of the plugin that holds the agent files, relative to the repository root. */
export const AGENTS_DIR = "plugins/claudetto/agents";

/** The thread's own body under the `agent` setting, which no session delegates to. */
const MAIN = "main";

/** The name an agent ships under, which is its file name without the extension. */
export const agentName = (agent: Agent): string =>
	agent.file.slice(AGENTS_DIR.length + 1, -".md".length);

/** `TOOL_NAMES` as plain strings, so a name read out of a text can be looked up in it. */
const TOOL_SET: readonly string[] = TOOL_NAMES;

/**
 * The agent names a delegation text points at: each backticked word that starts with a capital and
 * is not a tool. A tool is excluded so that the text may name one, as in "it has no `Bash`".
 */
export const rosterNames = (text: string): string[] => [
	...new Set(
		[...text.matchAll(/`([A-Z][A-Za-z]+)`/g)]
			.map((match) => match[1] ?? "")
			.filter((name) => !TOOL_SET.includes(name)),
	),
];

/**
 * One line per mismatch between a delegation text and the files that ship. A name with no file is a
 * type a session cannot call, which is how a folded agent returns; a file the text never names is an
 * agent the main loop is never told to pick. `main` is left out of both directions because it is the
 * thread's own body and never a delegation target.
 */
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

/** The agent files under `root`, as `plugins/claudetto/agents/<name>.md` paths. */
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
