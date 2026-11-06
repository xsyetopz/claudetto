import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { type Experiment, planExperiment, runExperiment, type Session, type SessionResult } from "../../src/ab/ab.ts";
import { cappedRun, launchArm } from "../../src/ab/session.ts";
import { type Arm, assertArm } from "../../src/arm/arm.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { type Fixture, loadFixtures } from "../../src/fixture/fixture.ts";
import { runFiles } from "../../src/launcher/launcher.ts";
import { readLedger, sumTokens } from "../../src/ledger/ledger.ts";
import { readStreamJson, replyText } from "../../src/reply/reply.ts";
import { MODELS } from "../../src/shared/model.ts";
import { resultUsage } from "../opener/probe.ts";
import {
	BASELINE_DIR,
	CONTEXT_FILE,
	CONTEXT_TEXT,
	canaryFor,
	fit,
	fixtureTokens,
	judgePrompt,
	judgeTokens,
	JUDGE_SYSTEM,
	outcome,
	orderFor,
	type Outcome,
	parseGrades,
	pick,
	readRules,
	replayCase,
	replayTokens,
	type RuleFile,
	ruleDiff,
	ruleEvidence,
	SPLIT_DIR,
	type Slot,
	tally,
} from "./rules.ts";

const PROBE = "rules-split";
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");
const TUNING = join(import.meta.dir, "../../dumps/fixtures/tuning.json");
const OUT = join(import.meta.dir, "../../dumps/rules-split");
const API = "https://api.anthropic.com";
// The user's limit for this measurement; the run stops when its own spend passes it.
const MEASURE_CAP = 1_800_000;
// Estimates run low or high; each run's bound is the estimate plus this margin, and the sizing leaves room for it.
const MARGIN = 1.2;
const RUN_CAP = 300_000;

const { values } = parseArgs({
	args: Bun.argv.slice(2),
	options: {
		run: { type: "boolean", default: false },
		dry: { type: "boolean", default: false },
		n: { type: "string" },
		tools: { type: "boolean", default: false },
		model: { type: "string", default: "opus" },
		judge: { type: "string", default: "sonnet" },
		budget: { type: "string", default: String(Math.floor(MEASURE_CAP / MARGIN)) },
	},
});
const modelOf = (k: string) => {
	const m = MODELS[k as keyof typeof MODELS];
	if (!m) {
		throw new Error(`model ${k}: want one of ${Object.keys(MODELS).join(", ")}`);
	}
	return m;
};
const model = modelOf(values.model);
const judgeModel = modelOf(values.judge);

const all = (await loadFixtures(TUNING)).fixtures;
const k = values.n ? Number(values.n) : fit(all, Number(values.budget));
const fixtures = pick(all, k);
const byId = new Map(all.map((f) => [f.id, f]));

const [baselineRules, splitRules] = await Promise.all([readRules(BASELINE_DIR), readRules(SPLIT_DIR)]);
const rulesOf = (arm: string): RuleFile[] => (arm === "baseline" ? baselineRules : splitRules);

const real = values.run && !values.dry;
// A real run passes the token by name; a launch with no token would reach the API unauthenticated.
const authEnv = real ? { ANTHROPIC_API_KEY: "" } : {};
const launchBase = { settingSources: ["user" as const], passEnv: real ? ["CLAUDE_CODE_OAUTH_TOKEN"] : [] };
const quiet = { DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" };

const replyArm = (name: "baseline" | "split"): Arm => ({
	name,
	plugins: [],
	flags: values.tools ? ["--permission-mode", "auto"] : ["--tools", ""],
	env: { ...quiet, ...authEnv },
	model,
	expect: { plugins: [], model, ...(values.tools ? { toolsInclude: ["Read"] } : { tools: [] }) },
});

type ReplyCase = ReturnType<typeof replayCase> & { bound: number };

interface Stored {
	reply: string;
	armOk: boolean;
	diff: string[];
	runId: string;
}
const repliesFile = join(OUT, `replies-${values.dry ? "dry" : "paid"}.json`);
const verdictsFile = join(OUT, `verdicts-${values.dry ? "dry" : "paid"}.json`);
const stored: Record<string, Partial<Record<"baseline" | "split", Stored>>> = (await Bun.file(repliesFile).exists())
	? ((await Bun.file(repliesFile).json()) as { replies: typeof stored }).replies
	: {};

const guard = async (start: number): Promise<void> => {
	const spent = (await readLedger(LEDGER)).totalTokens - start;
	if (spent > MEASURE_CAP) {
		throw new Error(`stopped: this measurement spent ${spent} tokens, over ${MEASURE_CAP}`);
	}
};

const replySession = (start: number) => async (s: Session<Arm, ReplyCase>): Promise<SessionResult> => {
	await guard(start);
	const { run } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: { steps: [], fallback: { blocks: [{ type: "text", text: "Done." }] } },
		...(real ? { forward: API } : {}),
		launch: { mode: "stream-json", ...launchBase },
		prepare: async (r) => {
			for (const f of rulesOf(s.arm.name)) {
				await Bun.write(join(r.dir, "config/rules/claudetto", f.name), f.text);
			}
			await mkdir(runFiles(r).work, { recursive: true });
			await Bun.write(join(runFiles(r).work, CONTEXT_FILE), CONTEXT_TEXT);
		},
	});
	const files = runFiles(run);
	const stdout = await Bun.file(files.stdout).text();
	const reply = readStreamJson(stdout);
	const requests = mainRequests(await readRequests(join(run.dir, "requests")));
	const ev = ruleEvidence(rulesOf(s.arm.name), rulesOf(s.arm.name === "baseline" ? "split" : "baseline"));
	const check = assertArm(s.arm.expect, { debugLog: await Bun.file(files.debug).text(), firstRequest: requests[0]?.body });
	const diff = [...check.diff, ...ruleDiff(requests.map((r) => r.body), ev), ...(reply.complete ? [] : [`reply: ${reply.reason}`])];
	(stored[s.case.name] ??= {})[s.arm.name as "baseline" | "split"] = { reply: replyText(reply), armOk: diff.length === 0, diff, runId: run.id };
	return {
		runId: run.id,
		model,
		usage: resultUsage(stdout) ?? { input_tokens: 0, output_tokens: 0 },
		...(await cappedRun(run)),
		verdict: { pass: true, label: "reply", evidence: "" },
		armCheck: { ok: diff.length === 0, diff },
	};
};

const todo = fixtures.filter((f) => !(stored[f.id]?.baseline && stored[f.id]?.split));
const replyExperiment: Experiment<Arm, ReplyCase> = {
	name: PROBE,
	arms: [replyArm("baseline"), replyArm("split")],
	cases: todo.map((f) => ({ ...replayCase(f), bound: Math.min(RUN_CAP, Math.ceil(replayTokens(f) * MARGIN)) })),
	n: 1,
	parallel: 3,
	tokenBoundPerRun: RUN_CAP,
	boundOf: (c) => c.bound,
};

interface JudgeCase {
	name: string;
	prompt: string;
	bound: number;
}
const judgeArm: Arm = {
	name: "judge",
	plugins: [],
	flags: ["--tools", "", "--system-prompt", JUDGE_SYSTEM],
	env: { ...quiet, ...authEnv },
	model: judgeModel,
	expect: { plugins: [], tools: [], model: judgeModel },
};
const verdicts: Record<string, { outcome: Outcome; order: Slot[]; answer: string; runId: string }> = (await Bun.file(verdictsFile).exists())
	? ((await Bun.file(verdictsFile).json()) as { verdicts: typeof verdicts }).verdicts
	: {};

const judgeSession = (start: number) => async (s: Session<Arm, JudgeCase>): Promise<SessionResult> => {
	await guard(start);
	const { run } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: { steps: [], fallback: { blocks: [{ type: "text", text: "Reading.\nA: good\nB: partial\nC: bad" }] } },
		...(real ? { forward: API } : {}),
		launch: { mode: "stream-json", ...launchBase, settingSources: ["project"] },
	});
	const files = runFiles(run);
	const stdout = await Bun.file(files.stdout).text();
	const reply = readStreamJson(stdout);
	const requests = mainRequests(await readRequests(join(run.dir, "requests")));
	const check = assertArm(s.arm.expect, { debugLog: await Bun.file(files.debug).text(), firstRequest: requests[0]?.body });
	const answer = replyText(reply);
	const o = outcome(parseGrades(answer, s.case.name));
	verdicts[s.case.name] = { outcome: o, order: orderFor(s.case.name), answer, runId: run.id };
	const diff = reply.complete ? check.diff : [...check.diff, `reply: ${reply.reason}`];
	return {
		runId: run.id,
		model: judgeModel,
		usage: resultUsage(stdout) ?? { input_tokens: 0, output_tokens: 0 },
		...(await cappedRun(run)),
		verdict: { pass: o === "better" || o === "same", label: o, evidence: answer },
		armCheck: { ok: diff.length === 0, diff },
	};
};

const judgeCases = (): JudgeCase[] =>
	fixtures
		.filter((f) => stored[f.id]?.baseline?.armOk && stored[f.id]?.split?.armOk && !verdicts[f.id])
		.map((f) => {
			const r = stored[f.id] as Record<"baseline" | "split", Stored>;
			const replies: Record<Slot, string> = { baseline: r.baseline.reply, split: r.split.reply, canary: canaryFor(f, all) };
			return { name: f.id, prompt: judgePrompt(f, replies), bound: Math.min(RUN_CAP, Math.ceil(judgeTokens(f) * MARGIN)) };
		});

const judgeExperiment = (): Experiment<Arm, JudgeCase> => {
	const cases = judgeCases();
	return { name: PROBE, arms: [judgeArm], cases, n: 1, parallel: 3, tokenBoundPerRun: RUN_CAP, boundOf: (c) => c.bound };
};

const save = async (): Promise<void> => {
	await mkdir(OUT, { recursive: true });
	await Bun.write(repliesFile, JSON.stringify({ model, tools: values.tools, replies: stored }, null, "\t"));
	await Bun.write(verdictsFile, JSON.stringify({ judgeModel, verdicts }, null, "\t"));
};

const report = (): void => {
	const ids = fixtures.map((f) => f.id).filter((id) => verdicts[id]);
	const t = tally(ids.map((id) => verdicts[id]?.outcome as Outcome));
	console.log(JSON.stringify({ fixtures: fixtures.length, judged: ids.length, ...t }, null, "\t"));
	console.log(["id", "outcome", "order"].join("\t"));
	for (const id of ids) {
		console.log([id, verdicts[id]?.outcome, verdicts[id]?.order.join(">")].join("\t"));
	}
};

const rejected = (r: { rejected: unknown[] }): void => console.log(`rejected sessions: ${r.rejected.length}`);

if (values.run || values.dry) {
	const ledger = values.dry ? join(OUT, "ledger-dry.jsonl") : LEDGER;
	if (values.dry) {
		await mkdir(OUT, { recursive: true });
		await Bun.write(ledger, "");
	} else if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
		throw new Error("CLAUDE_CODE_OAUTH_TOKEN is not set in this environment; a paid run has no auth");
	}
	const start = (await readLedger(ledger)).totalTokens;
	const goalCap = start + MEASURE_CAP;
	const onEntry = (e: { note?: string; model: string; usd: number; tokens: Parameters<typeof sumTokens>[0] }, l: { totalTokens: number; totalUsd: number }) =>
		console.log(`${e.note}\t${e.model}\t${sumTokens(e.tokens)} tokens\t$${e.usd.toFixed(4)}\trunning ${l.totalTokens} tokens $${l.totalUsd.toFixed(4)}`);
	if (todo.length > 0) {
		rejected(await runExperiment(replyExperiment, { run: true, ledger, base: "baseline", margin: 0, goalCap, onEntry, session: replySession(start) }));
		await save();
	}
	const je = judgeExperiment();
	if (je.cases.length > 0) {
		rejected(await runExperiment(je, { run: true, ledger, base: "judge", margin: 0, goalCap, onEntry, session: judgeSession(start) }));
		await save();
	}
	report();
} else {
	const total = fixtures.reduce((n, f) => n + fixtureTokens(f), 0);
	const rp = planExperiment(replyExperiment);
	console.log(`fixtures ${fixtures.length} of ${all.length} (budget ${values.budget}); reply model ${model}, tools ${values.tools ? "on" : "off"}, judge ${judgeModel}`);
	console.log(`reply sessions ${rp.sessions.length} (${todo.length} fixtures not yet stored), bound ${rp.tokenBound}; judge sessions ${fixtures.length}`);
	console.log(`estimate for all fixtures: ${total} tokens (bound with margin ${Math.round(total * MARGIN)}); stop line ${MEASURE_CAP}`);
	console.log("pass --run (paid, needs CLAUDE_CODE_OAUTH_TOKEN) or --dry (fake API)");
}
