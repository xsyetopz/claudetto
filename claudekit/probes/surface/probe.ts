import { join } from "node:path";
import { launchArm } from "../../src/ab/session.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";
import {
	settled,
	settledBeforeFirstRequest,
	timeline,
} from "../../src/timing/timing.ts";

// Task 5.21 / 5.24: the real claudetto plugin against the fake API. Prints, per run, the first request's sent tool bytes,
// which of the 18 prompt commands the skills listing names, and whether settings.read settled before the first request.
const PLUGIN = process.env["SURFACE_PLUGIN"] ?? join(import.meta.dir, "../../../plugins/claudetto");
const MODULE = process.env["SURFACE_MODULE"] ?? "claudetto@inline";
const OFF = [
	"batch",
	"simplify",
	"security-review",
	"code-review",
	"deep-research",
	"debug",
	"run",
	"verify",
	"insights",
	"team-onboarding",
	"fewer-permission-prompts",
	"run-skill-generator",
	"dataviz",
	"claude-api",
	"update-config",
	"workflow-authoring",
	"keybindings-help",
	"plugin-authoring",
];
const runs = Number(process.argv[2] ?? 1);
const prompt = process.argv[3] ?? "hi";

for (let i = 0; i < runs; i++) {
	const { run, result, requests } = await launchArm(
		{
			name: "surface",
			plugins: [{ dir: PLUGIN }],
			settings: process.env["SURFACE_DENY"]
				? { permissions: { deny: process.env["SURFACE_DENY"].split(",") } }
				: {},
			env: {},
			model: DEFAULT_MODEL,
			expect: { plugins: ["claudetto"], model: DEFAULT_MODEL },
		},
		{ name: "p", prompt },
		{
			probe: "surface",
			plan: {
				steps: [],
				fallback: { blocks: [{ type: "text", text: "Done." }] },
			},
			launch: { mode: "text", settingSources: ["project"] },
		},
	);
	const all = mainRequests(await readRequests(requests));
	const first = all[0]?.body;
	const tools = (first?.tools ?? []) as { name: string }[];
	const text = JSON.stringify(first ?? null);
	const marks = timeline(await Bun.file(result.files.debug).text());
	console.log(
		JSON.stringify({
			run: run.id,
			requests: all.length,
			toolBytes: new TextEncoder().encode(JSON.stringify(tools)).length,
			tools: tools.map((t) => t.name),
			listedOff: OFF.filter((n) => text.includes(`- ${n}:`)),
			settledMs: settled(marks, MODULE, "settings.read")[0]?.ms,
			settledFirst: settledBeforeFirstRequest(marks, MODULE, "settings.read"),
			systemBytes: new TextEncoder().encode(
				JSON.stringify(first?.system ?? null),
			).length,
		}),
	);
}
