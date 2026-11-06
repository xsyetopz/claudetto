import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, type Experiment, type Session, type SessionResult } from "../../src/ab/ab.ts";
import { cappedRun, launchArm } from "../../src/ab/session.ts";
import { type Arm, assertArm } from "../../src/arm/arm.ts";
import { mainRequests, readRequests } from "../../src/fake/fake.ts";
import { runFiles } from "../../src/launcher/launcher.ts";
import { appendEntry, cost, type Entry, readLedger, sumTokens, tokensOf, type Usage } from "../../src/ledger/ledger.ts";
import { firstSentence, readJsonOutput, readStreamJson, sentences } from "../../src/reply/reply.ts";
import { isRecord } from "../../src/shared/record.ts";
import { MODELS } from "../../src/shared/model.ts";
import { listRuns, type Run } from "../../src/workspace/workspace.ts";
import { opener } from "./opener.ts";

const PROBE = "opener";
const LEDGER = join(import.meta.dir, "../../ledger.jsonl");
// The record's plugin copies, prompts, and saved replies.
const OLD = "/tmp/probe-opener";
const STYLE = "claudetto:Concise";
// The record ran on Opus (settings-review.txt:3397), so the port does too.
const MODEL = MODELS.opus;
// The record's output cap after its cap fix (settings-review.txt:3411).
const CAP = "8000";
// The record's runs averaged 4,786 tokens (306,327 over 64), the largest 21,393 (one that went past the cap).
// 25,000 keeps the full rerun's 60 sessions inside the goal cap with the ledger's earlier total.
const TOKEN_BOUND = 25_000;
const API = "https://api.anthropic.com";

// settings-review.txt:3404-3407: bad openers out of n, per case and arm.
export const RECORD: Record<string, Record<string, { bad: number; n: number }>> = {
	complaint: { cur: { bad: 6, n: 9 }, fix: { bad: 2, n: 10 }, fix2: { bad: 7, n: 10 } },
	fact: { cur: { bad: 0, n: 10 }, fix: { bad: 8, n: 10 }, fix2: { bad: 0, n: 10 } },
};
// The record left these out of its counts: run 0 was a trial, and cur-complaint-10 wrote a tool call as text.
const EXCLUDED = /-0\.json$|^cur-complaint-10\.json$/;

export const arms: Arm[] = ["cur", "fix", "fix2"].map((name) => ({
	name,
	plugins: [{ dir: join(OLD, name) }],
	settings: { outputStyle: STYLE },
	env: { CLAUDE_CODE_MAX_OUTPUT_TOKENS: CAP, DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" },
	flags: ["--tools", ""],
	model: MODEL,
	// `--tools ""` sends no tool, so any tool in the first request is a leak into the arm.
	expect: { plugins: ["claudetto"], outputStyle: STYLE, model: MODEL, tools: [] },
}));

interface Case {
	name: string;
	prompt: string;
}

const prompt = (name: string): Promise<string> => Bun.file(join(OLD, `${name}.prompt`)).text();

// By default one paid run per arm on the fact case, where the record's arms differ most (0, 8, 0 of 10).
// `full` reruns the record's design, both cases × 10, because its saved replies hold only `.result` (O3).
const experiment = async (full: boolean): Promise<Experiment<Arm, Case>> => ({
	name: PROBE,
	arms,
	cases: await Promise.all((full ? ["complaint", "fact"] : ["fact"]).map(async (name) => ({ name, prompt: await prompt(name) }))),
	n: full ? 10 : 1,
	parallel: 3,
	tokenBoundPerRun: TOKEN_BOUND,
});

export const firstSentences = new Map<string, string>();

export const resultUsage = (stdout: string): Usage | undefined => {
	const frames = stdout.split("\n").filter((l) => l.trim().startsWith("{")).map((l) => JSON.parse(l) as unknown);
	const result = frames.findLast((f) => isRecord(f) && f.type === "result");
	return isRecord(result) && isRecord(result.usage) ? (result.usage as unknown as Usage) : undefined;
};

export const session = async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const { run } = await launchArm(s.arm, s.case, {
		probe: PROBE,
		plan: { steps: [] },
		forward: API,
		launch: { mode: "stream-json", auth: "login", settingSources: ["project", "local"] },
	});
	return judgeRun(s.arm, run);
};

// Grades a finished run from its folder, so a saved run replays through the same checks as a live one.
export const judgeRun = async (arm: Arm, run: Run): Promise<SessionResult> => {
	const files = runFiles(run);
	const stdout = await Bun.file(files.stdout).text();
	const reply = readStreamJson(stdout);
	const [first] = mainRequests(await readRequests(join(run.dir, "requests")));
	const armCheck = assertArm(arm.expect, { debugLog: await Bun.file(files.debug).text(), firstRequest: first?.body });
	// An unreadable reply is rejected like a wrong arm, so it counts on neither side.
	const diff = reply.complete ? armCheck.diff : [...armCheck.diff, `reply: ${reply.reason}`];
	const sentence = firstSentence(reply);
	firstSentences.set(run.id, sentence);
	return {
		runId: run.id,
		model: MODEL,
		usage: resultUsage(stdout) ?? { input_tokens: 0, output_tokens: 0 },
		...(await cappedRun(run)),
		verdict: opener.grade(sentence),
		armCheck: { ok: diff.length === 0, diff },
	};
};

// Re-judges every saved fresh run of this probe, without a call.
export const replayRuns = async (root?: string): Promise<(SessionResult & { arm: string })[]> => {
	const out: (SessionResult & { arm: string })[] = [];
	for (const r of await listRuns({ probe: PROBE, ...(root ? { root } : {}) })) {
		const arm = arms.find((a) => a.name === r.record?.arm);
		if (arm) {
			out.push({ ...(await judgeRun(arm, { id: r.id, dir: r.dir, probe: PROBE })), arm: arm.name });
		}
	}
	return out;
};

export interface Regrade {
	n: number;
	gradable: number;
	tailBad: number;
}

// The saved runs are lone result objects, so the reader confirms none whole. The tail column grades `.result`'s
// first sentence only to compare this grader with the record's, and is not a reply grade.
export const regradeOld = async (dir = join(OLD, "out")): Promise<Record<string, Record<string, Regrade>>> => {
	const out: Record<string, Record<string, Regrade>> = {};
	for (const path of [...new Bun.Glob("*-*-*.json").scanSync(dir)].sort()) {
		if (EXCLUDED.test(path)) {
			continue;
		}
		const [arm, c] = path.split("-") as [string, string];
		const reply = readJsonOutput(await Bun.file(join(dir, path)).text());
		const r = ((out[c] ??= {})[arm] ??= { n: 0, gradable: 0, tailBad: 0 });
		r.n++;
		r.gradable += reply.complete ? 1 : 0;
		r.tailBad += opener.grade(sentences(reply.tail ?? "")[0] ?? "").pass ? 0 : 1;
	}
	return out;
};

// The record's paid runs predate the kit; each enters the ledger once, priced by `cost` from its own usage.
export const backfillRecord = async (ledger: string, dirs = [join(OLD, "out"), join(OLD, "old")]): Promise<Entry[]> => {
	const seen = new Set((await readLedger(ledger)).entries.map((e) => e.runId));
	const added: Entry[] = [];
	for (const dir of dirs) {
		for (const path of [...new Bun.Glob("*-*-*.json").scanSync(dir)].sort()) {
			const runId = `record:${basename(dir)}/${path}`;
			const file = Bun.file(join(dir, path));
			const { usage, total_cost_usd } = (await file.json()) as { usage: Usage; total_cost_usd: number };
			if (!seen.has(runId)) {
				const entry: Entry = {
					at: new Date(file.lastModified).toISOString(),
					probe: PROBE,
					runId,
					model: MODEL,
					tokens: tokensOf(usage),
					usd: cost(MODEL, usage),
					note: `record run before the kit; CLI total_cost_usd ${total_cost_usd}`,
				};
				await appendEntry(ledger, entry);
				added.push(entry);
			}
		}
	}
	return added;
};

export const regradeTable =(byCase: Record<string, Record<string, Regrade>>): string => {
	const rows = Object.entries(byCase).flatMap(([c, byArm]) =>
		Object.entries(byArm).map(([arm, r]) => {
			const old = RECORD[c]?.[arm];
			return [c, arm, old ? `${old.bad}/${old.n}` : "none", `${r.gradable}/${r.n}`, `${r.tailBad}/${r.n}`].join("\t");
		}),
	);
	return ["case\tarm\told bad\treader gradable\tnew grader on tail (diagnostic)", ...rows].join("\n");
};

// Old and new bad openers per case and arm; a rejected session counts on neither side.
export const freshTable = (results: { arm: string; case: string; verdict: { pass: boolean }; armCheck: { ok: boolean } }[]): string => {
	const rows = Object.entries(RECORD).flatMap(([c, byArm]) =>
		Object.entries(byArm).map(([arm, old]) => {
			const mine = results.filter((r) => r.case === c && r.arm === arm);
			const graded = mine.filter((r) => r.armCheck.ok);
			const bad = graded.filter((r) => !r.verdict.pass).length;
			return [c, arm, `${old.bad}/${old.n}`, `${bad}/${graded.length}`, `${mine.length - graded.length}`].join("\t");
		}),
	);
	return ["case\tarm\told bad\tnew bad (reader)\trejected", ...rows].join("\n");
};

if (import.meta.main) {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			run: { type: "boolean", default: false },
			regrade: { type: "boolean", default: false },
			replay: { type: "boolean", default: false },
			backfill: { type: "boolean", default: false },
			full: { type: "boolean", default: false },
		},
	});
	const e = await experiment(values.full);
	if (values.backfill) {
		const added = await backfillRecord(LEDGER);
		const tokens = added.reduce((n, a) => n + sumTokens(a.tokens), 0);
		console.log(`added ${added.length} record runs, ${tokens} tokens, $${added.reduce((n, a) => n + a.usd, 0)}`);
	} else if (values.regrade) {
		console.log(regradeTable(await regradeOld()));
	} else if (values.replay) {
		for (const r of await replayRuns()) {
			const check = r.armCheck.ok ? "arm ok" : `rejected: ${r.armCheck.diff.join("; ").slice(0, 160)}`;
			console.log([r.arm, r.runId, r.verdict.label, check, JSON.stringify(firstSentences.get(r.runId))].join("\t"));
		}
	} else if (values.run) {
		const report = await runExperiment(e, { run: true, ledger: LEDGER, base: "cur", margin: 0, session });
		for (const r of report.results) {
			const old = RECORD[r.case]?.[r.arm];
			console.log(
				[r.arm, r.case, r.runId, old ? `old ${old.bad}/${old.n} bad` : "", r.verdict.label, JSON.stringify(firstSentences.get(r.runId))].join("\t"),
			);
		}
		console.log(freshTable(report.results));
		console.log(JSON.stringify({ cases: report.cases, rejected: report.rejected, usd: report.usd }, null, "\t"));
	} else {
		const plan = planExperiment(e);
		console.log(`plan: ${plan.sessions.length} sessions on ${MODEL}, bound ${plan.tokenBound} tokens; pass --run to start them`);
	}
}
