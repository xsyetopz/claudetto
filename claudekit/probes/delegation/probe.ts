import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { launchArm } from "../../src/ab/session.ts";
import { type Arm, assertArm } from "../../src/arm/arm.ts";
import { toolSizes } from "../../src/capture/capture.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import type { Plan } from "../../src/fake/plan.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";

// 5.18 lab: one fake-API session makes every listed Agent call; the report names what each subagent request ran as,
// the Agent tool and listing bytes of the first request, and each call's result text.
const PLUGIN = join(import.meta.dir, "../../../plugins/claudetto");

const CALLS: Record<string, Record<string, unknown>> = {
	untyped: {},
	"general-purpose": { subagent_type: "general-purpose" },
	claude: { subagent_type: "claude" },
	Explore: { subagent_type: "Explore" },
	Plan: { subagent_type: "Plan" },
	"claudetto:Artemis": {
		subagent_type: "claudetto:Artemis",
		run_in_background: false,
	},
	fork: { subagent_type: "fork" },
	"statusline-setup": { subagent_type: "statusline-setup" },
	"claude-code-guide": { subagent_type: "claude-code-guide" },
};

const BODIES: Record<string, string> = {
	Artemis: "You search the codebase",
	Metis: "You design an implementation plan",
	Heracles: "You carry out the task",
};

const arm: Arm = {
	name: "delegation",
	plugins: [{ dir: PLUGIN }],
	settings: { permissions: { allow: ["Agent"] } },
	model: DEFAULT_MODEL,
	expect: { plugins: ["claudetto"], model: DEFAULT_MODEL },
};

const plan: Plan = {
	steps: [
		{
			reply: {
				blocks: Object.entries(CALLS).map(([name, input]) => ({
					type: "tool_use" as const,
					name: "Agent",
					input: { description: name, prompt: `CASE ${name}`, ...input },
				})),
				stop: "tool_use",
			},
		},
	],
	fallback: { blocks: [{ type: "text", text: "Done." }] },
};

const text = (v: unknown): string => JSON.stringify(v) ?? "";

const { run, result, requests } = await launchArm(
	arm,
	{ name: "calls", prompt: "run the agent calls" },
	{
		probe: "delegation",
		plan,
		launch: { mode: "text", settingSources: ["project"] },
	},
);
const all = mainRequests(await readRequests(requests));
const first = all[0]?.body;
const agent = toolSizes(first).find((t) => t.name === "Agent");
const listing = text(first?.messages)
	.split("\\n")
	.filter((l) => l.startsWith("- claudetto:"))
	.join("\n");
console.info(`run ${run.id} exit ${result.exitCode} requests ${all.length}`);
console.info(
	`Agent tool ${agent?.bytes} bytes (description ${agent?.descriptionBytes}, schema ${agent?.schemaBytes})`,
);
console.info(`listing ${Buffer.byteLength(listing)} bytes: ${listing}`);
console.info(`total ${(agent?.bytes ?? 0) + Buffer.byteLength(listing)}`);
for (const r of all.slice(1)) {
	const sys = text(r.body.system);
	const as =
		Object.entries(BODIES).find(([, marker]) => sys.includes(marker))?.[0] ??
		"-";
	const prompt = text(r.body.messages).match(/CASE [\w:-]+/)?.[0] ?? "";
	console.info(
		`request ${r.n}: ${prompt || "(main)"} -> ${as}; system ${Buffer.byteLength(sys)} bytes; tools ${toolSizes(
			r.body,
		)
			.map((t) => t.name)
			.join(",")}`,
	);
}
const last = all.at(-1)?.body;
for (const m of text(last?.messages).matchAll(
	/Agent type '[^']*' not found[^"]*/g,
)) {
	console.info(`not found: ${m[0]}`);
}
console.info(
	`arm check ${text(assertArm(arm.expect, { debugLog: await readFile(result.files.debug, "utf8"), firstRequest: first }))}`,
);
