import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, type Experiment, type Session, type SessionResult } from "../../src/ab/ab.ts";
import { launchArm, measuresByArm } from "../../src/ab/session.ts";
import { type Arm, assertArm } from "../../src/arm/arm.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import type { Plan } from "../../src/fake/plan.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";
import { type Measure, measure, WRAPPER, wrapperOnly } from "./search.ts";

const PROBE = "monitor-search";
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");
const PLUGIN = join(import.meta.dir, "plugin");
const SETTINGS = { permissions: { allow: ["Bash", "Monitor", WRAPPER] } };
const OLD_BODIES = "/tmp/probe-fake/req";

// settings-review.txt:3286-3292: the tool the request after ToolSearch "monitor" gained, with its bytes.
export const RECORD: Record<string, { run: string; loaded: string }> = {
	stock: { run: "mon27", loaded: "Monitor 7586" },
	rewrite: { run: "mon29", loaded: `${WRAPPER} 866` },
};

export const arms: Arm[] = Object.keys(RECORD).map((mode) => ({
	name: mode,
	plugins: [{ dir: PLUGIN }],
	settings: SETTINGS,
	env: { MONITOR_SEARCH: mode },
	model: DEFAULT_MODEL,
	expect: {
		plugins: ["claudetto"],
		hookEvents: { "claudetto@inline": ["session.start", "tool.call", "tool.describe"] },
		toolsInclude: [WRAPPER],
		model: DEFAULT_MODEL,
	},
}));

interface Case {
	name: string;
	prompt: string;
}

// The recorded call (mon29 request 2901): the model searches for "monitor", then ends the turn.
const PLAN: Plan = {
	steps: [
		{
			reply: {
				blocks: [{ type: "tool_use", name: "ToolSearch", input: { query: "monitor", max_results: 5 } }],
				stop: "tool_use",
			},
		},
	],
	fallback: { blocks: [{ type: "text", text: "Done." }] },
};

const experiment: Experiment<Arm, Case> = {
	name: PROBE,
	arms,
	cases: [{ name: "search", prompt: "find the monitor tool" }],
	n: 5,
	parallel: 2,
	tokenBoundPerRun: 0,
};

export const measures = new Map<string, Measure>();

export const session = async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const { run, result, requests } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: PLAN,
		launch: { mode: "text", settingSources: ["project"] },
	});
	const [first, second] = mainRequests(await readRequests(requests));
	const m = measure(first?.body, second?.body);
	measures.set(run.id, m);
	return {
		runId: run.id,
		model: DEFAULT_MODEL,
		// A fake run costs nothing, so the ledger records zero tokens for it.
		usage: { input_tokens: 0, output_tokens: 0 },
		verdict: wrapperOnly.grade(m),
		armCheck: assertArm(s.arm.expect, { debugLog: await Bun.file(result.files.debug).text(), firstRequest: first?.body }),
	};
};

export const regradeOld = async (dir = OLD_BODIES): Promise<Record<string, Measure[]>> => {
	const out: Record<string, Measure[]> = {};
	for (const [arm, { run }] of Object.entries(RECORD)) {
		const [a, b] = (await readdir(join(dir, run))).filter((f) => /^\d+\.json$/.test(f)).sort();
		if (a === undefined || b === undefined) {
			throw new Error(`${join(dir, run)}: ${a === undefined ? 0 : 1} request bodies, want 2`);
		}
		out[arm] = [measure(await Bun.file(join(dir, run, a)).json(), await Bun.file(join(dir, run, b)).json())];
	}
	return out;
};

const shown = (m: Measure): string => m.loaded.map((t) => `${t.name} ${t.bytes}`).join(", ") || "none";

export const table = (byArm: Record<string, Measure[]>): string => {
	const rows = Object.entries(byArm).map(([arm, ms]) => {
		const kinds = [...new Set(ms.map(shown))];
		return [arm, RECORD[arm]?.loaded, `${kinds.join(" | ")} (${ms.length} runs)`, `${ms.filter((m) => wrapperOnly.grade(m).pass).length} of ${ms.length}`].join("\t");
	});
	return ["arm\told loaded\tnew loaded\twrapper only", ...rows].join("\n");
};

if (import.meta.main) {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: { run: { type: "boolean", default: false }, regrade: { type: "boolean", default: false } },
	});
	if (values.regrade) {
		console.log(table(await regradeOld()));
	} else if (values.run) {
		const report = await runExperiment(experiment, { run: true, ledger: LEDGER, base: "stock", margin: 0, session });
		console.log(table(measuresByArm(report.results, measures)));
		console.log(JSON.stringify({ cases: report.cases, rejected: report.rejected }, null, "\t"));
	} else {
		const plan = planExperiment(experiment);
		console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; pass --run to start them`);
	}
}
