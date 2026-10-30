import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { spawn } from "bun";
import { AGENT_ROSTER } from "../../plugins/claudetto/src/blocks/tool-describe/texts.ts";
import {
	AGENTS_DIR,
	agentFaults,
	bodyNamesWithheld,
	parseAgent,
	readAgents,
	rosterFaults,
	rosterNames,
	withheldBy,
} from "../../tools/agent-tools.ts";

const ROOT = join(import.meta.dir, "..", "..");

const byName = (a: string, b: string): number => a.localeCompare(b);

const AGENTS = new Map(
	(await readAgents(ROOT)).map((a) => [
		a.file.slice(AGENTS_DIR.length + 1, -".md".length),
		a,
	]),
);
const agentsByName = async () => AGENTS;

describe("the shipped agent files", () => {
	test("are the four kept agents and the main thread", async () => {
		expect([...(await agentsByName()).keys()].sort(byName)).toEqual([
			"Artemis",
			"Athena",
			"Hephaestus",
			"Hermes",
			"main",
		]);
	});

	test("Hephaestus declares the edit tools and `Bash`, so it can run the check of its step", async () => {
		expect((await agentsByName()).get("Hephaestus")?.tools).toEqual([
			"Read",
			"Edit",
			"Write",
			"Bash",
		]);
	});

	test("Hermes declares only the web tools and `Read`, so it changes no file", async () => {
		expect((await agentsByName()).get("Hermes")?.tools).toEqual([
			"WebSearch",
			"WebFetch",
			"Read",
		]);
	});

	test("Artemis declares Read, Grep, and Glob and no Bash", async () => {
		expect((await agentsByName()).get("Artemis")?.tools).toEqual([
			"Read",
			"Grep",
			"Glob",
		]);
	});

	test("Athena declares Read and Bash and not the pair that Bash costs it", async () => {
		expect((await agentsByName()).get("Athena")?.tools).toEqual([
			"Read",
			"Bash",
		]);
	});

	test("name in their body no tool the frontmatter withholds", async () => {
		const named = [...AGENTS.values()].map(bodyNamesWithheld);
		expect(named.flat()).toEqual([]);
	});

	test("carry no fault in the tree", async () => {
		expect(agentFaults([...(await agentsByName()).values()])).toEqual([]);
	});
});

describe("the declaration check", () => {
	const athena = (tools: string) =>
		parseAgent(
			"Athena.md",
			`---\nname: Athena\ntools: ${tools}\n---\nReview.\n`,
		);

	test("withholds Grep and Glob from an agent that has Bash", () => {
		expect(withheldBy(["Read", "Grep", "Glob", "Bash"])).toEqual([
			"Grep",
			"Glob",
		]);
		expect(withheldBy(["Read", "Grep", "Glob"])).toEqual([]);
	});

	test("names the file and both tools for Athena declaring Grep and Glob beside Bash", () => {
		expect(agentFaults([athena("Read, Grep, Glob, Bash")])).toEqual([
			expect.stringContaining("Athena.md: declares Grep and Glob beside Bash"),
		]);
	});

	test("passes the declaration without them", () => {
		expect(agentFaults([athena("Read, Bash")])).toEqual([]);
	});

	test("catches a body that names a tool the frontmatter lacks", () => {
		const artemis = parseAgent(
			"Artemis.md",
			`---
tools: Read, Grep, Glob
---
Fall back on grep in Bash.
`,
		);
		expect(agentFaults([artemis])).toEqual([
			expect.stringContaining("Artemis.md: the body names Bash"),
		]);
	});

	test("reads a file with no tools line as one that inherits every tool", () => {
		const main = parseAgent(
			"main.md",
			`---
name: main
---
Use Bash and Grep.
`,
		);
		expect(main.tools).toBeNull();
		expect(agentFaults([main])).toEqual([]);
	});

	test("exits 0 on the tree", async () => {
		const run = spawn(["bun", join(ROOT, "tools", "agent-tools.ts")], {
			stderr: "pipe",
		});
		expect(await run.exited).toBe(0);
	});
});

describe("the delegation text against the files", () => {
	const shipped = [...AGENTS.values()];

	test("names every agent that ships and nothing that does not", () => {
		expect(rosterFaults(AGENT_ROSTER, shipped)).toEqual([]);
		expect(rosterNames(AGENT_ROSTER).sort(byName)).toEqual([
			"Artemis",
			"Athena",
			"Hephaestus",
			"Hermes",
		]);
	});

	test("refuses a folded name planted back, because no file ships it", () => {
		const planted = `${AGENT_ROSTER} Use \`Zeus\` for a plan.`;
		expect(rosterFaults(planted, shipped)).toEqual([
			"the delegation text names Zeus, and no file of plugins/claudetto/agents/ ships it",
		]);
	});

	test("refuses a shipped agent that the text never names", () => {
		expect(rosterFaults("Two types ship: `Artemis` alone.", shipped)).toEqual([
			"Athena ships, and the delegation text never names it",
			"Hephaestus ships, and the delegation text never names it",
			"Hermes ships, and the delegation text never names it",
		]);
	});

	test("reads no tool name as an agent, so the text may name one", () => {
		expect(rosterNames("`Artemis` has no `Bash` and no `Write`.")).toEqual([
			"Artemis",
		]);
	});
});
