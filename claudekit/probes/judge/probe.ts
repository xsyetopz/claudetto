import { join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, type Experiment, type Session, type SessionResult } from "../../src/ab/ab.ts";
import { cappedRun, launchArm } from "../../src/ab/session.ts";
import { type Arm, assertArm } from "../../src/arm/arm.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { type Fixture, loadFixtures } from "../../src/fixture/fixture.ts";
import { runFiles } from "../../src/launcher/launcher.ts";
import { readStreamJson, replyText } from "../../src/reply/reply.ts";
import { MODELS } from "../../src/shared/model.ts";
import { resultUsage } from "../opener/probe.ts";
import { casePrompt, parseAnswer, SYSTEM, sample } from "./judge.ts";

const PROBE = "judge";
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");
const TUNING = join(import.meta.dir, "../../dumps/fixtures/tuning.json");
const OUT = join(import.meta.dir, "../../dumps/fixtures/judge-sample.json");
const API = "https://api.anthropic.com";
const TOKEN_BOUND = 25_000;

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		run: { type: "boolean", default: false },
		model: { type: "string", default: "haiku" },
		n: { type: "string", default: "30" },
	},
});
const model = MODELS[values.model as keyof typeof MODELS];
if (model === undefined) {
	throw new Error(`--model ${values.model}: want one of ${Object.keys(MODELS).join(", ")}`);
}

interface Case {
	name: string;
	prompt: string;
}

const arm: Arm = {
	name: values.model,
	plugins: [],
	flags: ["--tools", "", "--system-prompt", SYSTEM],
	env: { DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" },
	model,
	expect: { plugins: [], tools: [], model },
};

const fixtures: Fixture[] = sample((await loadFixtures(TUNING)).fixtures, Number(values.n));
const readings = new Map<string, { label: string; reading: string }>();

const session = async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const { run } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: { steps: [] },
		forward: API,
		launch: { mode: "stream-json", auth: "login", settingSources: ["project"] },
	});
	const files = runFiles(run);
	const stdout = await Bun.file(files.stdout).text();
	const reply = readStreamJson(stdout);
	const [first] = mainRequests(await readRequests(join(run.dir, "requests")));
	const armCheck = assertArm(s.arm.expect, { debugLog: await Bun.file(files.debug).text(), firstRequest: first?.body });
	const diff = reply.complete ? armCheck.diff : [...armCheck.diff, `reply: ${reply.reason}`];
	const read = parseAnswer(replyText(reply));
	readings.set(s.case.name, read);
	return {
		runId: run.id,
		model,
		usage: resultUsage(stdout) ?? { input_tokens: 0, output_tokens: 0 },
		...(await cappedRun(run)),
		verdict: { pass: read.label === "ok", label: read.label, evidence: read.reading },
		armCheck: { ok: diff.length === 0, diff },
	};
};

const experiment: Experiment<Arm, Case> = {
	name: PROBE,
	arms: [arm],
	cases: fixtures.map((f) => ({ name: f.id, prompt: casePrompt(f) })),
	n: 1,
	parallel: 3,
	tokenBoundPerRun: TOKEN_BOUND,
};

if (values.run) {
	const report = await runExperiment(experiment, { run: true, ledger: LEDGER, base: arm.name, margin: 0, session });
	const rows = fixtures.map((f) => ({ id: f.id, source: f.source, ...readings.get(f.id) }));
	await Bun.write(OUT, JSON.stringify({ model, rows }, null, "\t"));
	const byLabel = Object.groupBy(rows, (r) => r.label ?? "missing");
	console.log(
		JSON.stringify({
			n: rows.length,
			byLabel: Object.fromEntries(Object.entries(byLabel).map(([k, v]) => [k, v?.length])),
			rejected: report.rejected,
			usd: report.usd,
			out: OUT,
		}),
	);
} else {
	const plan = planExperiment(experiment);
	console.log(`plan: ${plan.sessions.length} sessions on ${model}, bound ${plan.tokenBound} tokens; pass --run to start them`);
}
