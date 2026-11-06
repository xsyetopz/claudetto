// 18.8: how often the model follows Concise.md's `<requests_to_the_user>` line.
// Reuses the removed claudekit (A/B runner, launcher, ledger, workspace, fake API) from /tmp/claudekit-leftovers.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment, runExperiment, wilson, type Experiment, type Session, type SessionResult } from "/tmp/claudekit-leftovers/claudekit/src/ab/ab.ts";
import { materializeArm, type Arm } from "/tmp/claudekit-leftovers/claudekit/src/arm/arm.ts";
import { startFake } from "/tmp/claudekit-leftovers/claudekit/src/fake/fake.ts";
import type { Plan } from "/tmp/claudekit-leftovers/claudekit/src/fake/plan.ts";
import { launch, runFiles, type LaunchSpec } from "/tmp/claudekit-leftovers/claudekit/src/launcher/launcher.ts";
import { cost, readLedger, tokensOf } from "/tmp/claudekit-leftovers/claudekit/src/ledger/ledger.ts";
import { readStreamJson, replyText } from "/tmp/claudekit-leftovers/claudekit/src/reply/reply.ts";
import { isRecord } from "/tmp/claudekit-leftovers/claudekit/src/shared/record.ts";
import { MODELS } from "/tmp/claudekit-leftovers/claudekit/src/shared/model.ts";
import { createRun } from "/tmp/claudekit-leftovers/claudekit/src/workspace/workspace.ts";

let ROOT = "/tmp/probe-18-8";
let MODE = "default";
let ARMS = ["plugin", "base"];
const STYLE = "claudetto:Concise";
const TOKEN = "CLAUDE_CODE_OAUTH_TOKEN";
const MODEL = MODELS.sonnet;
const USD_STOP = 14;
let PLUGIN = "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto";
const OPEN_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+\[ \]\s+(.*\S)\s*$/;
const HEADING = /what i need from you/i;
const BANG = /(^|[\s`])!\s*\S/;

interface Row { arm: string; case: string; runId: string; checkbox: boolean; form: boolean; formQ: boolean; heading: boolean; capped: boolean; tokens: number; usd: number; armDiff: string[]; reply: string }

// The three labels in prompts.json, applied to the final reply text.
// 18-20 adds formQ: like form, but an item may instead be one question (ends in "?", holds one "?").
const ONE_QUESTION = (l: string): boolean => { const t = l.replace(/[*_`\s]+$/, ""); return t.endsWith("?") && t.split("?").length === 2; };
export const grade = (text: string): Pick<Row, "checkbox" | "form" | "formQ" | "heading"> => {
	const items = text.split("\n").filter((l) => OPEN_ITEM.test(l));
	return { checkbox: items.length > 0, heading: HEADING.test(text), form: items.length > 0 && HEADING.test(text) && items.every((l) => BANG.test(l)), formQ: items.length > 0 && HEADING.test(text) && items.every((l) => BANG.test(l) || ONE_QUESTION(l)) };
};

const arm = (name: string, plugin: boolean): Arm => ({
	name,
	plugins: plugin ? [{ dir: PLUGIN }] : [],
	settings: plugin ? { outputStyle: STYLE } : {},
	env: { DISABLE_ERROR_REPORTING: "1" },
	flags: ["--tools", "Read,Write,Edit,Glob,Grep", "--permission-mode", MODE, "--max-budget-usd", "1"],
	model: MODEL,
	expect: {},
});

const DRY: Plan = { steps: [], fallback: { blocks: [{ type: "text", text: "Done.\n\nWhat I Need from You\n- [ ] `! sudo ls`" }] } };

type Case = { name: string; prompt: string };

const sessionOf = (mode: { fake: boolean; out: string; ledger: string }) => async (s: Session<Arm, Case>): Promise<SessionResult> => {
	const led = await readLedger(mode.ledger);
	if (led.totalUsd > USD_STOP) throw new Error(`stop: ledger $${led.totalUsd.toFixed(2)} passed $${USD_STOP}`);
	const run = await createRun({ probe: "ab", root: ROOT, quiet: true });
	const files = runFiles(run);
	const { pluginDirs, treeHashes } = await materializeArm(s.arm, run);
	mkdirSync(files.work, { recursive: true });
	writeFileSync(join(files.work, ".created-by-claudetto"), process.env.CLAUDE_CODE_SESSION_ID ?? "");
	const spec: LaunchSpec = { prompt: s.case.prompt, mode: "stream-json", model: MODEL, auth: "fake", pluginDirs, pluginTreeHashes: treeHashes, settings: s.arm.settings ?? {}, settingSources: [], env: s.arm.env ?? {}, flags: s.arm.flags ?? [], cwd: files.work, arm: s.arm.name, case: s.case.name };
	if (!mode.fake && !process.env[TOKEN]) throw new Error(`${TOKEN} unset: run with bun --env-file=.env from the repo root`);
	const fake = mode.fake ? await startFake({ plan: DRY, dir: join(run.dir, "requests") }) : undefined;
	try {
		const done = await launch(fake ? { ...spec, baseUrl: fake.url } : { ...spec, passEnv: [TOKEN] }, run);
		const stdout = await Bun.file(done.files.stdout).text();
		const frames = stdout.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as unknown);
		const init = frames.find((f) => isRecord(f) && f.subtype === "init");
		const result = frames.findLast((f) => isRecord(f) && f.type === "result");
		const usage = isRecord(result) && isRecord(result.usage) ? (result.usage as never) : (done.record.usage ?? { input_tokens: 0, output_tokens: 0 });
		const diff: string[] = [];
		if (!isRecord(init)) diff.push("no init frame");
		else {
			const style = String(init.output_style);
			const names = (Array.isArray(init.plugins) ? init.plugins.filter(isRecord) : []).map((p) => p.name);
			const isPlugin = s.arm.name === "plugin";
			if (isPlugin !== (style === STYLE)) diff.push(`style ${style}`);
			if (isPlugin !== names.includes("claudetto")) diff.push(`plugins ${names.join(",")}`);
			if (init.model !== MODEL) diff.push(`model ${String(init.model)}`);
		}
		const reply = readStreamJson(stdout);
		const text = reply.segments.at(-1)?.text ?? "";
		const tokens = Object.values(tokensOf(usage)).reduce((a, b) => a + b, 0);
		const row: Row = { arm: s.arm.name, case: s.case.name, runId: run.id, ...grade(text), capped: done.capped, tokens, usd: cost(MODEL, usage), armDiff: diff, reply: replyText(reply) };
		appendFileSync(join(mode.out, "sessions.jsonl"), `${JSON.stringify(row)}\n`);
		const pass = !done.capped && diff.length === 0;
		return { runId: run.id, model: MODEL, usage, ...(done.capped ? { capped: true } : {}), verdict: { pass, label: pass ? "ok" : "fail", evidence: diff.join(",") }, armCheck: { ok: diff.length === 0, diff } };
	} finally {
		await fake?.stop();
	}
};

const report = async (out: string): Promise<string[]> => {
	const rows = (await Bun.file(join(out, "sessions.jsonl")).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
	return ARMS.map((a) => {
		const all = rows.filter((x) => x.arm === a);
		const r = all.filter((x) => x.armDiff.length === 0);
		const f = (k: "checkbox" | "form" | "formQ" | "heading"): string => {
			const c = r.filter((x) => x[k]).length;
			const [lo, hi] = wilson(c, r.length);
			return `${k} ${c}/${r.length} Wilson95 ${lo.toFixed(3)}-${hi.toFixed(3)}`;
		};
		return `${a}\t${f("checkbox")}\t${f("form")}\t${f("formQ")}\t${f("heading")}\trejected ${all.length - r.length}\tcapped ${all.filter((x) => x.capped).length}\ttokens ${all.reduce((n, x) => n + x.tokens, 0)}\t$${all.reduce((n, x) => n + x.usd, 0).toFixed(4)}\tlargest ${Math.max(0, ...all.map((x) => x.tokens))}`;
	});
};

if (import.meta.main) {
	const { values } = parseArgs({ args: Bun.argv.slice(2), options: { out: { type: "string" }, dry: { type: "boolean" }, run: { type: "boolean" }, report: { type: "boolean" }, limit: { type: "string" }, mode: { type: "string" }, prompts: { type: "string" }, plugin: { type: "string" }, root: { type: "string" }, "plugin-only": { type: "boolean" } } });
	ROOT = values.root ?? ROOT;
	MODE = values.mode ?? MODE;
	PLUGIN = values.plugin ?? PLUGIN;
	if (values["plugin-only"]) ARMS = ["plugin"];
	const out = values.out ?? join(ROOT, "out");
	if (values.report) {
		console.log((await report(out)).join("\n"));
	} else {
		const set = (await Bun.file(values.prompts ?? join(import.meta.dir, "prompts.json")).json()) as { prompts: string[] };
		const cases = set.prompts.slice(0, Number(values.limit ?? set.prompts.length)).map((prompt, i) => ({ name: `p${String(i + 1).padStart(2, "0")}`, prompt }));
		const e: Experiment<Arm, Case> = { name: "18-8", arms: ARMS.map((a) => arm(a, a === "plugin")), cases, n: 1, parallel: 6, tokenBoundPerRun: 300_000 };
		const plan = planExperiment(e);
		mkdirSync(out, { recursive: true });
		const ledger = join(out, "ledger.jsonl");
		const led = await readLedger(ledger);
		console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens`);
		if (values.run || values.dry) {
			const r = await runExperiment(e, { run: true, ledger, base: ARMS[0] ?? "base", margin: 0, goalCap: led.totalTokens + plan.tokenBound, session: sessionOf({ fake: !!values.dry, out, ledger }) });
			console.log(JSON.stringify({ rejected: r.rejected, usd: r.usd }));
			console.log((await report(out)).join("\n"));
		}
	}
}
