import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, type Experiment, type Session, type SessionResult } from "../../src/ab/ab.ts";
import { launchArm, measuresByArm } from "../../src/ab/session.ts";
import { type Arm, assertArm, type Patch } from "../../src/arm/arm.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { DEFAULT_MODEL } from "../../src/shared/model.ts";
import { keptOut, type Measure, measure } from "./race.ts";

const PROBE = "settings-race";
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");
const PLUGIN = join(import.meta.dir, "plugin");
const MODULE = "race@inline";
const SETTINGS = { permissions: { allow: ["Bash"] } };

// settings-review.txt:3359-3369, 5 runs per arm: the settle range in ms and how many first requests listed simplify.
export const RECORD: Record<string, { settled: [number, number]; listed: number }> = {
	seq: { settled: [82.9, 90.6], listed: 5 },
	par: { settled: [36.7, 68.4], listed: 3 },
	none: { settled: [20.3, 28.8], listed: 0 },
	one: { settled: [13.5, 14.5], listed: 0 },
	store: { settled: [34.5, 35.8], listed: 0 },
	exists1: { settled: [13.4, 31.8], listed: 0 },
	write1: { settled: [13.3, 17.5], listed: 0 },
	list4: { settled: [13.7, 16.9], listed: 0 },
	par8: { settled: [13.0, 15.5], listed: 0 },
	seq8: { settled: [36.3, 38.7], listed: 0 },
	date9: { settled: [13.7, 28.9], listed: 0 },
};

// The recorded runs: debug logs from the probe's hook (module claudetto@inline) and the fake's saved bodies.
const OLD_DEBUG = "/tmp/probe-fsx";
const OLD_BODIES = "/tmp/probe-fake/req";
const OLD_MODULE = "claudetto@inline";

export const arms: Arm[] = Object.keys(RECORD).map((mode) => ({
	name: mode,
	plugins: [{ dir: PLUGIN }],
	settings: SETTINGS,
	env: { RACE_MODE: mode },
	model: DEFAULT_MODEL,
	expect: { plugins: ["race"], hookEvents: { [MODULE]: ["settings.read", "session.start"] }, model: DEFAULT_MODEL },
}));

interface VariantSpec {
	modes: string[];
	patches: Patch[];
	events: string[];
	env?: Record<string, string>;
}

// Diagnostic arms for the recorded slow seq and par runs, each one difference from the recorded setup.
// nostart: those runs loaded a hook with no session.start (fr-seq-1.debug:89). abs: they wrote under /tmp, outside the work folder.
const VARIANTS = {
	nostart: {
		modes: ["seq", "par", "none"],
		patches: [{ file: "hooks/register.ts", find: 'on("session.start",', replace: '((_event: string, hook: unknown) => hook)("session.start",' }],
		events: ["settings.read"],
	},
	abs: {
		modes: ["seq", "par"],
		patches: ["start", "done"].map((step) => ({
			file: "hooks/register.ts",
			find: `\`race-log-\${mode}-${step}\``,
			replace: `\`/tmp/probe-race-abs/log-\${mode}-${step}\``,
		})),
		events: ["settings.read", "session.start"],
	},
	// oldcfg: they shared one config folder across runs (ovrun.sh: CLAUDE_CONFIG_DIR=/tmp/probe-fake/cfg); this is a copy of it.
	oldcfg: {
		modes: ["seq", "par", "none"],
		patches: [],
		events: ["settings.read", "session.start"],
		env: { CLAUDE_CONFIG_DIR: join(tmpdir(), "probe-race-cfg") },
	},
} satisfies Record<string, VariantSpec>;
type Variant = keyof typeof VARIANTS;

export const variantArms = (variant: Variant): Arm[] => {
	const v: VariantSpec = VARIANTS[variant];
	return v.modes.map((mode) => ({
		...(arms.find((a) => a.name === mode) as Arm),
		name: `${mode}-${variant}`,
		plugins: [{ dir: PLUGIN, patches: v.patches }],
		env: { RACE_MODE: mode, ...v.env },
		expect: { plugins: ["race"], hookEvents: { [MODULE]: v.events }, model: DEFAULT_MODEL },
	}));
};

interface Case {
	name: string;
	prompt: string;
}

// One at a time, as the recorded runs were: parallel sessions would load the machine and move the settle times.
const experiment: Experiment<Arm, Case> = { name: PROBE, arms, cases: [{ name: "hi", prompt: "hi" }], n: 5, parallel: 1, tokenBoundPerRun: 0 };

export const measures = new Map<string, Measure>();

export const session = async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const { run, result, requests } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: { steps: [], fallback: { blocks: [{ type: "text", text: "Done." }] } },
		launch: { mode: "text", settingSources: ["project"] },
	});
	const [first] = mainRequests(await readRequests(requests));
	const debugLog = await Bun.file(result.files.debug).text();
	measures.set(run.id, measure(debugLog, first?.body, MODULE));
	return {
		runId: run.id,
		model: DEFAULT_MODEL,
		// A fake run costs nothing, so the ledger records zero tokens for it.
		usage: { input_tokens: 0, output_tokens: 0 },
		verdict: keptOut.grade(first?.body),
		armCheck: assertArm(s.arm.expect, { debugLog, firstRequest: first?.body }),
	};
};

export const regradeOld = async (): Promise<Record<string, Measure[]>> => {
	const out: Record<string, Measure[]> = {};
	for (const mode of Object.keys(RECORD)) {
		out[mode] = await Promise.all(
			[1, 2, 3, 4, 5].map(async (i) => {
				const dir = join(OLD_BODIES, `fr-${mode}-${i}`);
				const [body] = (await readdir(dir)).filter((f) => f.endsWith(".json"));
				return measure(
					await Bun.file(join(OLD_DEBUG, `fr-${mode}-${i}.debug`)).text(),
					await Bun.file(join(dir, body as string)).json(),
					OLD_MODULE,
				);
			}),
		);
	}
	return out;
};

export const table = (byArm: Record<string, Measure[]>): string => {
	const range = (ms: number[]) => (ms.length === 0 ? "none" : `${Math.min(...ms).toFixed(1)}-${Math.max(...ms).toFixed(1)}`);
	const rows = Object.entries(byArm).map(([arm, m]) => {
		const r = RECORD[arm.replace(/-\w+$/, "")] as (typeof RECORD)[string];
		const ms = m.flatMap((x) => (x.settledMs === undefined ? [] : [x.settledMs]));
		const unsettled = m.length - ms.length;
		const first = m.filter((x) => x.settledFirst === true).length;
		return [
			arm,
			range(r.settled),
			`${range(ms)}${unsettled > 0 ? `, ${unsettled} none` : ""}`,
			`${r.listed} of 5`,
			`${m.filter((x) => x.listed).length} of ${m.length}`,
			`${first} of ${m.length}`,
		].join("\t");
	});
	return ["arm\told settled ms\tnew settled ms\told listed\tnew listed\tnew settled first", ...rows].join("\n");
};

if (import.meta.main) {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			run: { type: "boolean", default: false },
			regrade: { type: "boolean", default: false },
			variant: { type: "string" },
		},
	});
	const variant = values.variant;
	if (variant !== undefined && !(variant in VARIANTS)) {
		throw new Error(`--variant ${JSON.stringify(variant)}: want ${Object.keys(VARIANTS).join(", ")}`);
	}
	const e = variant === undefined ? experiment : { ...experiment, arms: variantArms(variant as Variant) };
	if (values.regrade) {
		console.log(table(await regradeOld()));
	} else if (values.run) {
		const report = await runExperiment(e, { run: true, ledger: LEDGER, base: e.arms[0]?.name ?? "", margin: 0, session });
		console.log(table(measuresByArm(report.results, measures)));
		console.log(JSON.stringify({ cases: report.cases, rejected: report.rejected }, null, "\t"));
	} else {
		const plan = planExperiment(e);
		console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; pass --run to start them`);
	}
}
