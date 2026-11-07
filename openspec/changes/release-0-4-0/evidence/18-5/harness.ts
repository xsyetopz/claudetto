// Shared by the 18.5 and 18.6 probes. It reuses the removed claudekit's runner (A/B plan, launcher, ledger, workspace, fake API) by absolute path.
import { appendFileSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, wilson, type Experiment, type Session, type SessionResult } from "/tmp/claudekit-leftovers/claudekit/src/ab/ab.ts";
import { materializeArm, type Arm } from "/tmp/claudekit-leftovers/claudekit/src/arm/arm.ts";
import { startFake } from "/tmp/claudekit-leftovers/claudekit/src/fake/fake.ts";
import type { Plan } from "/tmp/claudekit-leftovers/claudekit/src/fake/plan.ts";
import { launch, runFiles, type LaunchSpec } from "/tmp/claudekit-leftovers/claudekit/src/launcher/launcher.ts";
import { cost, readLedger, tokensOf, type Usage } from "/tmp/claudekit-leftovers/claudekit/src/ledger/ledger.ts";
import { readStreamJson, type Reply } from "/tmp/claudekit-leftovers/claudekit/src/reply/reply.ts";
import { isRecord } from "/tmp/claudekit-leftovers/claudekit/src/shared/record.ts";
import { MODELS } from "/tmp/claudekit-leftovers/claudekit/src/shared/model.ts";
import { createRun } from "/tmp/claudekit-leftovers/claudekit/src/workspace/workspace.ts";
import { fisher } from "/tmp/claudekit-leftovers/claudekit/probes/narration/narration.ts";
import { resultUsage } from "/tmp/claudekit-leftovers/claudekit/probes/opener/probe.ts";

export { fisher, wilson };

const REPO = "/Users/krystian/CodeProjects/xsyetopz/claudetto";
const PLUGIN = join(REPO, "plugins/claudetto");
// Names copied by reference from the parent env, so a token is never read or printed here.
// The plugin is for Pro and Max subscribers, so real runs bill the subscription; an API key would win over the token and bill the API.
const PASS = ["CLAUDE_CODE_OAUTH_TOKEN"];
const TOOLS = ["Bash(grep:*)", "Bash(rg:*)", "Bash(wc:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(sed:*)", "Bash(cat:*)", "Bash(ls:*)", "Bash(find:*)", "Bash(awk:*)", "Bash(jq:*)", "Bash(bun:*)"];

export interface Task {
	name: string;
	files: Record<string, string>;
	prompt: string;
	// Fake API: the calls a dry run makes in this workspace.
	dry: (cwd: string) => { name: string; input: Record<string, unknown> };
}

export interface ArmSpec {
	name: string;
	plugin: boolean;
	options?: Record<string, unknown>;
	settings?: Record<string, unknown>;
}

export interface Study {
	probe: string;
	root: string;
	arms: ArmSpec[];
	tasks: Task[];
	// Metrics of one session: numbers and booleans, summed or counted by the report.
	score: (reply: Reply, cwd: string, stdout: string) => Record<string, number>;
}

export interface Row {
	arm: string;
	task: string;
	index: number;
	runId: string;
	capped: boolean;
	timedOut: boolean;
	armDiff: string[];
	usd: number;
	tokens: number;
	usage: Usage;
	m: Record<string, number>;
}

const git = async (cwd: string, ...args: string[]): Promise<void> => {
	const p = Bun.spawn(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, stdout: "ignore", stderr: "ignore" });
	await p.exited;
};

const armOf = (a: ArmSpec, model: string): Arm => ({
	name: a.name,
	plugins: a.plugin ? [{ dir: PLUGIN }] : [],
	settings: { ...(a.options ? { pluginConfigs: { claudetto: { options: a.options } } } : {}), ...(a.settings ?? {}) },
	env: { DISABLE_ERROR_REPORTING: "1" },
	flags: ["--permission-mode", "acceptEdits", "--allowedTools", TOOLS.join(","), "--max-budget-usd", process.env.ARM_BUDGET_USD ?? "1"],
	model,
	expect: {},
});

// The init frame names the plugins and the model that this session really ran with.
const armDiff = (stdout: string, a: ArmSpec, model: string, fake: boolean): string[] => {
	const init = stdout.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as unknown).find((f) => isRecord(f) && f.subtype === "init");
	if (!isRecord(init)) {
		return ["no init frame"];
	}
	const loaded = (Array.isArray(init.plugins) ? init.plugins.filter(isRecord) : []).some((p) => p.name === "claudetto");
	return [...(loaded === a.plugin ? [] : [`claudetto loaded ${loaded}, want ${a.plugin}`]), ...(init.model === model ? [] : [`model ${String(init.model)}, want ${model}`]), ...(fake || init.apiKeySource === "none" ? [] : [`apiKeySource ${String(init.apiKeySource)}, want none (subscription)`])];
};

interface Mode {
	fake: boolean;
	ledger: string;
	out: string;
	model: string;
}

const run1 = (study: Study, mode: Mode) => async (s: Session<ArmSpec, Task>): Promise<SessionResult & { row: Row }> => {
	const run = await createRun({ probe: study.probe, root: join(study.root, "runs"), quiet: true });
	// The marker of this lab's sandbox rule: the session id of the lead that made the folder.
	writeFileSync(join(run.dir, ".created-by-claudetto"), process.env.CLAUDE_CODE_SESSION_ID ?? "");
	const files = runFiles(run);
	const arm = armOf(s.arm, mode.model);
	const { pluginDirs, treeHashes } = await materializeArm(arm, run);
	for (const [path, text] of Object.entries(s.case.files)) {
		await Bun.write(join(files.work, path), text);
	}
	await git(files.work, "init", "-q");
	await git(files.work, "add", "-A");
	await git(files.work, "commit", "-qm", "base");
	const cwd = realpathSync(files.work);
	const spec: LaunchSpec = {
		prompt: s.case.prompt,
		mode: "stream-json",
		model: mode.model,
		auth: "fake",
		pluginDirs,
		pluginTreeHashes: treeHashes,
		settings: arm.settings ?? {},
		settingSources: ["project", "local"],
		env: arm.env ?? {},
		flags: arm.flags ?? [],
		cwd,
		arm: arm.name,
		case: s.case.name,
	};
	let done;
	if (mode.fake) {
		const call = s.case.dry(cwd);
		const plan: Plan = {
			steps: [{ match: { hasTools: true }, reply: { blocks: [{ type: "tool_use", ...call }], stop: "tool_use" } }],
			fallback: { blocks: [{ type: "text", text: "Done." }] },
		};
		const fake = await startFake({ plan, dir: join(run.dir, "requests") });
		try {
			done = await launch({ ...spec, baseUrl: fake.url }, run);
		} finally {
			await fake.stop();
		}
	} else {
		done = await launch({ ...spec, passEnv: PASS }, run);
	}
	const stdout = await Bun.file(done.files.stdout).text();
	const reply = readStreamJson(stdout);
	const usage = resultUsage(stdout) ?? done.record.usage ?? { input_tokens: 0, output_tokens: 0 };
	const row: Row = {
		arm: s.arm.name,
		task: s.case.name,
		index: s.index,
		runId: run.id,
		capped: done.capped,
		timedOut: done.timedOut,
		armDiff: armDiff(stdout, s.arm, mode.model, mode.fake),
		usd: cost(mode.model, usage),
		tokens: Object.values(tokensOf(usage)).reduce((a, b) => a + b, 0),
		usage,
		m: study.score(reply, cwd, stdout),
	};
	appendFileSync(join(mode.out, "sessions.jsonl"), `${JSON.stringify(row)}\n`);
	return {
		runId: run.id,
		model: mode.model as SessionResult["model"],
		usage,
		...(done.capped ? { capped: true } : {}),
		verdict: { pass: true, label: "ok", evidence: "" },
		armCheck: { ok: row.armDiff.length === 0, diff: row.armDiff },
		row,
	};
};

export const sizeOf = (path: string): number => {
	try {
		return statSync(path).size;
	} catch {
		return 0;
	}
};

export const readOf = (path: string): string => {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return "";
	}
};

// Deterministic noise for generated workspaces.
export const rng = (seed: number): (() => number) => {
	let s = seed >>> 0;
	return () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 2 ** 32;
	};
};

// Statistics for token counts. The mean test permutes the arm labels with a seeded generator; the rank test is Mann-Whitney U with ties and a normal approximation.
const mean = (x: number[]): number => x.reduce((p, q) => p + q, 0) / x.length;

export const permutationP = (a: number[], b: number[], rounds = 100_000, seed = 1): number => {
	const rand = rng(seed);
	const observed = Math.abs(mean(a) - mean(b));
	const all = [...a, ...b];
	let hits = 0;
	for (let r = 0; r < rounds; r++) {
		for (let i = all.length - 1; i > 0; i--) {
			const j = Math.floor(rand() * (i + 1));
			[all[i], all[j]] = [all[j] as number, all[i] as number];
		}
		if (Math.abs(mean(all.slice(0, a.length)) - mean(all.slice(a.length))) >= observed - 1e-9) {
			hits++;
		}
	}
	return (hits + 1) / (rounds + 1);
};

// Abramowitz and Stegun 7.1.26.
const normalCdf = (z: number): number => {
	const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
	const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
	const erf = 1 - poly * Math.exp(-(z * z) / 2);
	return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};

export const mannWhitneyP = (a: number[], b: number[]): number => {
	const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
	const ranks = new Array<number>(all.length).fill(0);
	let tie = 0;
	for (let i = 0; i < all.length; ) {
		let j = i;
		while (j + 1 < all.length && (all[j + 1] as { v: number }).v === (all[i] as { v: number }).v) {
			j++;
		}
		for (let k = i; k <= j; k++) {
			ranks[k] = (i + j) / 2 + 1;
		}
		tie += (j - i + 1) ** 3 - (j - i + 1);
		i = j + 1;
	}
	const n1 = a.length;
	const n2 = b.length;
	const n = n1 + n2;
	const r1 = all.reduce((s, x, i) => s + (x.g === 0 ? (ranks[i] as number) : 0), 0);
	const u = r1 - (n1 * (n1 + 1)) / 2;
	const sd = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tie / (n * (n - 1))));
	return sd === 0 ? 1 : 2 * (1 - normalCdf(Math.abs(u - (n1 * n2) / 2) / sd));
};

// Percentile bootstrap of the mean, seeded.
export const bootstrapMean = (x: number[], rounds = 5000, seed = 7): [number, number] => {
	const rand = rng(seed);
	const means = Array.from({ length: rounds }, () => mean(Array.from(x, () => x[Math.floor(rand() * x.length)] as number))).sort((p, q) => p - q);
	return [means[Math.floor(rounds * 0.025)] as number, means[Math.floor(rounds * 0.975)] as number];
};

export const readRows = (out: string): Row[] =>
	readFileSync(join(out, "sessions.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row).filter((r) => r.armDiff.length === 0);

export const cli = async (study: Study, report: (rows: Row[], arms: string[]) => string[]): Promise<void> => {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			n: { type: "string", default: "5" },
			only: { type: "string" },
			model: { type: "string", default: MODELS.haiku },
			out: { type: "string" },
			ledger: { type: "string" },
			dry: { type: "boolean", default: false },
			run: { type: "boolean", default: false },
			report: { type: "boolean", default: false },
			parallel: { type: "string", default: "4" },
		},
	});
	const out = values.out ?? join(study.root, "out");
	const ledgerFile = values.ledger ?? join(study.root, "ledger.jsonl");
	const arms = study.arms.map((a) => a.name);
	if (values.report) {
		console.log(report(readRows(out), arms).join("\n"));
		return;
	}
	const tasks = study.tasks.filter((t) => !values.only || new RegExp(values.only).test(t.name));
	const e: Experiment<ArmSpec, Task> = { name: study.probe, arms: study.arms, cases: tasks, n: Number(values.n), parallel: Number(values.parallel), tokenBoundPerRun: 300_000 };
	const plan = planExperiment(e);
	const ledger = await readLedger(ledgerFile);
	console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; ledger ${ledger.totalTokens} tokens, $${ledger.totalUsd.toFixed(4)}`);
	if (!values.run && !values.dry) {
		return;
	}
	mkdirSync(out, { recursive: true });
	const mode: Mode = { fake: values.dry, ledger: ledgerFile, out, model: values.model };
	const r = await runExperiment(e, { run: true, ledger: ledgerFile, base: "base", margin: 0, goalCap: ledger.totalTokens + plan.tokenBound, session: run1(study, mode) });
	console.log(JSON.stringify({ rejected: r.rejected, usd: r.usd }, null, "\t"));
	console.log(report(readRows(out), arms).join("\n"));
};
