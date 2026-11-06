// 18.7: does the model reach for a deferred tool (Read, Write, Skill, ListAgents) when a task needs it?
// Reuses the removed claudekit's runner (ab, launcher, ledger, workspace, fake) from /tmp/claudekit-leftovers.
import { appendFileSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
const K = "/tmp/claudekit-leftovers/claudekit";
const { planExperiment, runExperiment, wilson } = await import(`${K}/src/ab/ab.ts`);
const { materializeArm } = await import(`${K}/src/arm/arm.ts`);
const { startFake } = await import(`${K}/src/fake/fake.ts`);
const { launch, runFiles } = await import(`${K}/src/launcher/launcher.ts`);
const { appendEntry, cost, readLedger, tokensOf } = await import(`${K}/src/ledger/ledger.ts`);
const { readStreamJson } = await import(`${K}/src/reply/reply.ts`);
const { isRecord } = await import(`${K}/src/shared/record.ts`);
const { MODELS } = await import(`${K}/src/shared/model.ts`);
const { createRun } = await import(`${K}/src/workspace/workspace.ts`);
const { resultUsage } = await import(`${K}/probes/opener/probe.ts`);
const { fisher } = await import(`${K}/probes/narration/narration.ts`);

const PROBE = "reach-18-7";
const ROOT = "/tmp/probe-18-7";
const PLUGIN = join(import.meta.dir, "../../../../../plugins/claudetto");
const TOKEN = "CLAUDE_CODE_OAUTH_TOKEN";
const MODEL = MODELS.sonnet;
const CASES = (await Bun.file(join(import.meta.dir, "cases.json")).json()) as { id: string; tool: string; prompt: string; files: Record<string, string> }[];

const arm = (name: string, plugins: { dir: string }[]) => ({
	name, plugins, model: MODEL, expect: {},
	flags: ["--permission-mode", "acceptEdits", "--max-budget-usd", "1"],
	env: { DISABLE_ERROR_REPORTING: "1" },
});
const ARMS = [arm("change", [{ dir: PLUGIN }]), arm("base", [])];

// Reach: the needed tool was called and answered without an error; `searched` is a ToolSearch call that names it.
const reach = (reply: ReturnType<typeof readStreamJson>, tool: string) => {
	const calls = reply.toolCalls.filter((c) => c.name === tool);
	const ok = calls.some((c) => reply.toolResults.some((r) => r.toolUseId === c.id && !r.isError));
	const searched = reply.toolCalls.some((c) => c.name === "ToolSearch" && JSON.stringify(c.input).includes(tool));
	return { called: calls.length > 0, ok, searched };
};

const initFrame = (stdout: string) =>
	stdout.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l) as unknown).find((f) => isRecord(f) && f.subtype === "init") as Record<string, unknown> | undefined;

// Fakes still running; a failed session leaves its siblings' fakes, so every exit path stops them.
const fakes = new Set<{ pid: number }>();
const stopFakes = () => { for (const f of fakes) try { process.kill(f.pid); } catch {} };
process.on("exit", stopFakes);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(sig, () => { stopFakes(); process.exit(1); });

const mode = (values: { dry: boolean; out: string; ledger: string }) => async (s: { arm: any; case: any }) => {
	const c = s.case.c as (typeof CASES)[number];
	const run = await createRun({ probe: PROBE, root: `${ROOT}/runs`, quiet: true });
	const files = runFiles(run);
	const { pluginDirs, treeHashes } = await materializeArm(s.arm, run);
	for (const [p, t] of Object.entries({ ...c.files, ".created-by-claudetto": process.env.CLAUDE_CODE_SESSION_ID ?? "" })) await Bun.write(join(files.work, p), t);
	const cwd = realpathSync(files.work);
	const spec = {
		prompt: c.prompt, mode: "stream-json", model: s.arm.model, auth: "fake", pluginDirs, pluginTreeHashes: treeHashes,
		settings: {}, settingSources: ["project", "local"], env: s.arm.env, flags: s.arm.flags, cwd, arm: s.arm.name, case: c.id, capTokens: 300_000,
	};
	let done;
	if (values.dry) {
		const plan = { steps: [{ reply: { blocks: [{ type: "tool_use", name: c.tool, input: {} }], stop: "tool_use" } }], fallback: { blocks: [{ type: "text", text: "done" }] } };
		const fake = await startFake({ plan, dir: join(run.dir, "requests") });
		fakes.add(fake);
		try { done = await launch({ ...spec, baseUrl: fake.url }, run); } finally { fakes.delete(fake); await fake.stop(); }
	} else {
		done = await launch({ ...spec, passEnv: [TOKEN] }, run);
	}
	const stdout = await Bun.file(done.files.stdout).text();
	const reply = readStreamJson(stdout);
	const init = initFrame(stdout);
	const plugins = Array.isArray(init?.plugins) ? (init.plugins as any[]).filter(isRecord).map((p) => p.name) : [];
	const diff = [
		...(init ? [] : ["no init frame"]),
		...(plugins.includes("claudetto") === (s.arm.name === "change") ? [] : [`plugins ${JSON.stringify(plugins)}`]),
		...(init?.model === s.arm.model ? [] : [`model ${String(init?.model)}`]),
	];
	const usage = resultUsage(stdout) ?? done.record.usage ?? { input_tokens: 0, output_tokens: 0 };
	const r = reach(reply, c.tool);
	const tokens = Object.values(tokensOf(usage)).reduce((a: number, b: any) => a + b, 0) as number;
	const row = {
		arm: s.arm.name, case: c.id, tool: c.tool, runId: run.id, ...r, tools: Array.isArray(init?.tools) ? init.tools : [],
		calls: reply.toolCalls.map((t: any) => t.name), capped: done.capped, tokens, usd: cost(s.arm.model, usage), armDiff: diff,
	};
	appendFileSync(join(values.out, "sessions.jsonl"), `${JSON.stringify(row)}\n`);
	return {
		runId: run.id, model: MODEL, usage, ...(done.capped ? { capped: true } : {}),
		verdict: { pass: r.ok, label: r.ok ? "reached" : "missed", evidence: row.calls.join(",") },
		armCheck: { ok: diff.length === 0, diff },
	};
};

const rate = (k: number, n: number) => { const [lo, hi] = wilson(k, n); return `${k}/${n} (${(lo).toFixed(3)}-${(hi).toFixed(3)})`; };

const report = async (out: string): Promise<string[]> => {
	const rows = (await Bun.file(join(out, "sessions.jsonl")).text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.armDiff.length === 0);
	const by = (a: string) => rows.filter((r) => r.arm === a);
	const t = (a: string) => { const x = by(a); return { n: x.length, ok: x.filter((r) => r.ok).length, called: x.filter((r) => r.called).length, searched: x.filter((r) => r.searched).length, tokens: x.reduce((s, r) => s + r.tokens, 0), usd: x.reduce((s, r) => s + r.usd, 0), largest: Math.max(0, ...x.map((r) => r.tokens)), capped: x.filter((r) => r.capped).length }; };
	const [c, b] = [t("change"), t("base")];
	const lines = [c, b].map((x, i) => `${i ? "base" : "change"}\treached ${rate(x.ok, x.n)}\tcalled ${rate(x.called, x.n)}\tToolSearch named tool ${rate(x.searched, x.n)}\ttokens ${x.tokens}\t$${x.usd.toFixed(4)}\tlargest ${x.largest}\tcapped ${x.capped}`);
	lines.push(`Fisher two-sided reached p=${fisher(c.ok, c.n, b.ok, b.n).toFixed(4)}\tcalled p=${fisher(c.called, c.n, b.called, b.n).toFixed(4)}`);
	for (const tool of ["Read", "Write", "Skill", "ListAgents"]) {
		const f = (a: string) => by(a).filter((r) => r.tool === tool);
		lines.push(`${tool}\tchange ${rate(f("change").filter((r) => r.ok).length, f("change").length)}\tbase ${rate(f("base").filter((r) => r.ok).length, f("base").length)}`);
	}
	return lines;
};

if (import.meta.main) {
	const { values } = parseArgs({ args: Bun.argv.slice(2), options: { n: { type: "string", default: "4" }, out: { type: "string", default: `${ROOT}/out` }, ledger: { type: "string", default: `${ROOT}/ledger.jsonl` }, dry: { type: "boolean", default: false }, run: { type: "boolean", default: false }, report: { type: "boolean", default: false } } });
	if (values.report) {
		console.log((await report(values.out)).join("\n"));
	} else {
		mkdirSync(values.out, { recursive: true });
		const e = { name: PROBE, arms: ARMS, cases: CASES.map((c) => ({ name: c.id, c })), n: Number(values.n), parallel: 6, tokenBoundPerRun: 300_000 };
		const plan = planExperiment(e);
		const ledger = await readLedger(values.ledger);
		console.log(`plan: ${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens; ledger ${ledger.totalTokens} tokens, $${ledger.totalUsd.toFixed(4)}`);
		if (values.run || values.dry) {
			const r = await runExperiment(e, { run: true, ledger: values.ledger, base: "base", margin: 0, goalCap: ledger.totalTokens + plan.tokenBound, session: mode({ dry: values.dry, out: values.out, ledger: values.ledger }) as never });
			console.log(JSON.stringify({ rejected: r.rejected, usd: r.usd }, null, "\t"));
			console.log((await report(values.out)).join("\n"));
		}
	}
}
