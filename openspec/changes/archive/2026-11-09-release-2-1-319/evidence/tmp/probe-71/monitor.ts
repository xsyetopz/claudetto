import { join } from "node:path";
import { launchArm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/ab/session.ts";
import type { Arm } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/arm/arm.ts";
import { toolSizes } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/capture/capture.ts";
import { mainRequests, readRequests } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/fake/fake.ts";
import type { Plan, Step } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/fake/plan.ts";
import { DEFAULT_MODEL } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/shared/model.ts";

// 5.17 and 5.23 lab: the model searches, calls the wrapper, calls the stock tool, and the report shows each result
// the next request carried. Usage: bun monitor.ts monitor|ask|keyword
const PLUGIN = "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto";
const mode = process.argv[2] ?? "monitor";

const call = (name: string, input: Record<string, unknown>): Step => ({
	reply: { blocks: [{ type: "tool_use", name, input }], stop: "tool_use" },
});

const STEPS: Record<string, Step[]> = {
	monitor: [
		call("ToolSearch", {
			query: "select:mcp__claudetto__monitor",
			max_results: 5,
		}),
		call("mcp__claudetto__monitor", {
			command: "for i in 1 2; do echo ev$i; sleep 1; done",
			description: "probe events",
			timeout_ms: 20_000,
		}),
		call("Bash", { command: "sleep 4; echo slept", description: "busy" }),
		call("Monitor", {
			command: "echo own",
			description: "own",
			timeout_ms: 5000,
		}),
	],
	keyword: [call("ToolSearch", { query: "monitor", max_results: 5 })],
	byname: [call("ToolSearch", { query: "select:Monitor", max_results: 5 })],
	askname: [call("ToolSearch", { query: "select:AskUserQuestion", max_results: 5 })],
	other: [call("ToolSearch", { query: "select:WebFetch", max_results: 5 })],
	workflow: [call("ToolSearch", { query: "select:Workflow", max_results: 5 })],
	texts: [call("ToolSearch", { query: "select:Read,Write,Skill,EnterWorktree,ExitWorktree,SendMessage,TaskStop,WebFetch,WebSearch,NotebookEdit", max_results: 10 })],
	ask: [
		call("ToolSearch", { query: "select:AskUserQuestion", max_results: 5 }),
		call("mcp__claudetto__ask-user-question", {
			question: "Pick?",
			options: ["A", "B"],
			multiSelect: true,
		}),
		call("AskUserQuestion", { questions: [] }),
	],
};

const arm: Arm = {
	name: mode,
	plugins: [{ dir: PLUGIN }],
	settings: {
		permissions: {
			allow: [
				"Bash",
				"Monitor",
				"mcp__claudetto__monitor",
				"mcp__claudetto__ask-user-question",
			],
			...(process.env["DENY"] ? { deny: process.env["DENY"].split(",") } : {}),
		},
	},
	model: DEFAULT_MODEL,
	expect: { plugins: ["claudetto"], model: DEFAULT_MODEL },
};
const plan: Plan = {
	steps: STEPS[mode] ?? [],
	fallback: { blocks: [{ type: "text", text: "Done." }] },
};

const { run, result, requests } = await launchArm(
	arm,
	{ name: mode, prompt: "go" },
	{
		probe: "delegation",
		plan,
		launch: { mode: "text", settingSources: ["project"] },
	},
);
const all = mainRequests(await readRequests(requests));
console.info(`run ${run.id} exit ${result.exitCode} requests ${all.length}`);
const seen = new Set<string>();
for (const r of all) {
	const names = toolSizes(r.body).map((t) => `${t.name}:${t.bytes}`);
	const fresh = names.filter((n) => !seen.has(n.split(":")[0] ?? ""));
	for (const n of names) {
		seen.add(n.split(":")[0] ?? "");
	}
	console.info(`request ${r.n}: new tools ${fresh.join(", ") || "-"}`);
	const last = r.body.messages.at(-1);
	console.info(`  last message: ${JSON.stringify(last).slice(0, 700)}`);
}
