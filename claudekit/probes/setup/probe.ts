import { join } from "node:path";
import { launchArm } from "../../src/ab/session.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";

// Real claudetto against the fake API, with and without the eight denies setup writes. Prints, per case, which of the
// eight the first request names anywhere (tool list, deferred-tool listing, or text).
const PLUGIN = join(import.meta.dir, "../../../plugins/claudetto");
const DENIED = [
	"Workflow",
	"ScheduleWakeup",
	"ReportFindings",
	"CronCreate",
	"CronDelete",
	"CronList",
	"EnterPlanMode",
	"ExitPlanMode",
];

const arm = async (name: string, deny: readonly string[]) => {
	const { run, requests } = await launchArm(
		{
			name: "setup",
			plugins: [{ dir: PLUGIN }],
			settings: { permissions: { deny: [...deny] } },
			env: {},
			model: DEFAULT_MODEL,
			expect: { plugins: ["claudetto"], model: DEFAULT_MODEL },
		},
		{ name, prompt: "hi" },
		{
			probe: "setup",
			plan: {
				steps: [],
				fallback: { blocks: [{ type: "text", text: "Done." }] },
			},
			launch: { mode: "text", settingSources: ["project"] },
		},
	);
	const first = mainRequests(await readRequests(requests))[0]?.body;
	const text = JSON.stringify(first ?? null);
	console.log(
		JSON.stringify({
			case: name,
			run: run.id,
			named: DENIED.filter(
				(tool) => text.includes(`"${tool}"`) || text.includes(`${tool}\\n`),
			),
		}) + "\n",
	);
};

await arm("no-deny", []);
await arm("deny", DENIED);
