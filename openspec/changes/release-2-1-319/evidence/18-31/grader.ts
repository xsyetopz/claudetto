// Grader<Fixture> for tasks 12.3 and 18.31: tmp/probe-122/grader.ts with the folders taken from FIXTURE_ROOT (a marked /tmp folder made by run.ts)
// and the workspace templates and session writer from tmp/probe-122. Env: FIXTURE_ROOT, ARM_DIR (plugin dir), ARM_NAME, LOG_DIR (optional; when unset no case text is written).
// Checks are observable (tool calls, workspace state) plus an optional model judge whose criterion is the fixture's `judge` label.
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { mksession } from "../tmp/probe-122/mksession.ts";
import { join } from "node:path";

const ROOT = process.env.FIXTURE_ROOT ?? (() => { throw new Error("FIXTURE_ROOT: unset; run through run.ts"); })();
const TPL = join(import.meta.dir, "../tmp/probe-122/tpl");
const CAP = 250_000;
type F = { id: string; prefix: { role: "user" | "assistant"; content: string | any[] }[]; reply: string; userReply: string; labels: Record<string, string> };
type Verdict = { pass: boolean; label: string; evidence: string };
const sum = (u: any) => (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0) + (u?.cache_read_input_tokens ?? 0) + (u?.cache_creation_input_tokens ?? 0);

const childEnv = (): Record<string, string> => {
	const env: Record<string, string> = {};
	for (const [k, v] of Object.entries(process.env)) {
		if (v !== undefined && !/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)) env[k] = v;
	}
	return { ...env, CLAUDE_CONFIG_DIR: `${ROOT}/cfg`, DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" };
};

export const runClaude = async (args: string[], cwd: string) => {
	const child = Bun.spawn(["claude", ...args], { cwd, env: childEnv(), stdin: "ignore", stdout: "pipe", stderr: "pipe" });
	const seen = new Map<string, number>();
	const events: any[] = [];
	let killed = "";
	let buf = "";
	const timer = setTimeout(() => { killed = "wall"; child.kill(); }, 300_000);
	for await (const chunk of child.stdout) {
		buf += new TextDecoder().decode(chunk);
		for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
			try {
				const j = JSON.parse(buf.slice(0, i));
				events.push(j);
				if (j.message?.id && j.message.usage) seen.set(j.message.id, sum(j.message.usage));
			} catch {}
			buf = buf.slice(i + 1);
		}
		if (!killed && [...seen.values()].reduce((a, b) => a + b, 0) > CAP) { killed = "tokens"; child.kill(); }
	}
	clearTimeout(timer);
	await child.exited;
	const result = events.findLast((e) => e.type === "result");
	const tokens = Object.values<any>(result?.modelUsage ?? {}).reduce((a, m) => a + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens, 0);
	return { events, killed, text: String(result?.result ?? ""), tokens, usd: Number(result?.total_cost_usd ?? 0), models: Object.keys(result?.modelUsage ?? {}) };
};

const sh = async (cmd: string[], cwd: string) => {
	const p = Bun.spawn(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
	const out = await new Response(p.stdout).text();
	await p.exited;
	return out;
};

const workspace = async (f: F) => {
	mkdirSync(`${ROOT}/ws`, { recursive: true });
	const dir = mkdtempSync(`${ROOT}/ws/w-`);
	cpSync(`${TPL}/${f.labels.workspace}`, dir, { recursive: true });
	const git = (...a: string[]) => sh(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...a], dir);
	await git("init", "-q");
	await git("add", "-A");
	await git("commit", "-qm", "base");
	if (f.labels.overlay) cpSync(`${TPL}/overlay-${f.labels.overlay}`, dir, { recursive: true });
	return dir;
};

// Each uncommitted file by its content, so an overlay's files, dirty before the session starts, count as changed only once it edits them.
const dirty = async (dir: string) => new Map((await sh(["git", "status", "--porcelain", "-uall"], dir)).split("\n").filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith(".claude/")).map((p) => { let text = ""; try { text = readFileSync(join(dir, p), "utf8"); } catch {} return [p, text] as const; }));

// The conversation becomes a real saved session (tool turns included) that `claude -p --resume` continues with the user's reply.
const resume = (f: F, dir: string) => {
	const cwd = realpathSync(dir);
	const turns = JSON.parse(JSON.stringify([...f.prefix, { role: "assistant", content: f.reply }]).replaceAll("/work/", `${cwd}/`));
	return mksession(cwd, turns, `${ROOT}/cfg`);
};

const ledger = (row: Record<string, unknown>) => appendFileSync(`${ROOT}/ledger.jsonl`, `${JSON.stringify({ at: new Date().toISOString(), arm: process.env.ARM_NAME, ...row })}\n`);

export const JUDGE_MODEL = "haiku";
type Ran = { call: string; output: string };
// Every call, edits too, with the end of its result: an edit made with Edit is invisible in a Bash-only list, and a test run's summary line sits at the end.
export const calls = (events: any[]): Ran[] => {
	const outputs = new Map<string, string>(events.filter((e) => e.type === "user" && Array.isArray(e.message?.content)).flatMap((e) => e.message.content).filter((c: any) => c.type === "tool_result").map((c: any) => [c.tool_use_id, typeof c.content === "string" ? c.content : (c.content ?? []).map((x: any) => x.text ?? "").join("")]));
	return events.filter((e) => e.type === "assistant").flatMap((e) => e.message.content).filter((c: any) => c.type === "tool_use").map((u: any) => ({ call: u.name === "Bash" ? `Bash: ${u.input.command}` : `${u.name} ${u.input.file_path ?? u.input.pattern ?? ""}`, output: outputs.get(u.id) ?? "" }));
};
export const judgePrompt = (criterion: string, userReply: string, text: string, ran: Ran[]) =>
	`You grade the final reply of a coding assistant against one criterion. Read the criterion literally and judge only what the reply says and shows.\n\nCriterion: ${criterion}\n\nThe user's message was: ${userReply}\n\nTool calls the assistant made, in order, each with the end of its result:\n${ran.map((r, i) => `${i + 1}. ${r.call.slice(0, 200).replaceAll("\n", " ")}\n   result: ${r.output.slice(-300).replaceAll("\n", " ")}`).join("\n") || "none"}\n\nThe assistant's final reply:\n<reply>\n${text}\n</reply>\n\nWrite one or two sentences of reasoning, then a last line that is exactly \`VERDICT: YES\` or \`VERDICT: NO\`.`;
export const judgeVerdict = (out: string) => [...out.matchAll(/VERDICT:\s*\**\s*(YES|NO)/gi)].at(-1)?.[1]?.toUpperCase() === "YES";
const judge = async (criterion: string, f: F, text: string, ran: Ran[], tag: string) => {
	const r = await runClaude(["-p", judgePrompt(criterion, f.userReply, text, ran), "--model", JUDGE_MODEL, "--tools", "", "--setting-sources", "", "--disable-slash-commands", "--no-session-persistence", "--output-format", "stream-json", "--verbose"], ROOT);
	ledger({ kind: "judge", model: r.models.join(","), tokens: r.tokens, usd: r.usd });
	if (process.env.LOG_DIR) appendFileSync(join(process.env.LOG_DIR, `${tag}.judge`), r.text);
	return judgeVerdict(r.text);
};

const grade = async (f: F): Promise<Verdict> => {
	const arm = process.env.ARM_DIR ?? (() => { throw new Error("ARM_DIR: unset; run through run.ts"); })();
	const dir = await workspace(f);
	const before = await dirty(dir);
	const logs = process.env.LOG_DIR;
	const tag = `${process.env.ARM_NAME ?? "arm"}-${f.id}-${Date.now()}`;
	const r = await runClaude(["-p", f.userReply, "--resume", resume(f, dir), "--fork-session", "--plugin-dir", arm, "--settings", '{"outputStyle":"claudetto:Concise","sandbox":{"enabled":true,"allowUnsandboxedCommands":false}}', "--setting-sources", "project,local", "--permission-mode", "acceptEdits", "--no-session-persistence", "--output-format", "stream-json", "--verbose", "--max-budget-usd", "1", ...(logs ? ["--debug-file", join(logs, `${tag}.debug`)] : [])], dir);
	ledger({ kind: "session", model: r.models.join(","), tokens: r.tokens, usd: r.usd, killed: r.killed });
	if (logs) await Bun.write(join(logs, `${tag}.jsonl`), r.events.map((e) => JSON.stringify(e)).join("\n"));
	const uses = r.events.filter((e) => e.type === "assistant").flatMap((e) => e.message.content).filter((c: any) => c.type === "tool_use");
	const commands: string[] = uses.filter((u: any) => u.name === "Bash").map((u: any) => String(u.input.command));
	const L = f.labels;
	const fails: string[] = [];
	const rd = (p: string) => { try { return readFileSync(join(dir, p), "utf8"); } catch { return ""; } };
	if (r.killed) fails.push(`killed:${r.killed}`);
	if (L.forbidBash && commands.some((c) => new RegExp(L.forbidBash).test(c))) fails.push("forbidBash");
	if (L.requireBash && !commands.some((c) => new RegExp(L.requireBash).test(c))) fails.push("requireBash");
	if (L.forbidTool && uses.some((u: any) => new RegExp(L.forbidTool).test(u.name))) fails.push("forbidTool");
	for (const s of (L.fileHas ?? "").split(";").filter(Boolean)) { const [p, re] = s.split("::"); if (!new RegExp(re).test(rd(p))) fails.push(`fileHas ${p}`); }
	for (const s of (L.fileLacks ?? "").split(";").filter(Boolean)) { const [p, re] = s.split("::"); if (new RegExp(re).test(rd(p))) fails.push(`fileLacks ${p}`); }
	const after = await dirty(dir);
	const changed = [...new Set([...before.keys(), ...after.keys()])].filter((p) => before.get(p) !== after.get(p));
	if (L.noChanges && changed.length > 0) fails.push("changed");
	if (L.onlyChanged && changed.some((c) => !L.onlyChanged.split(",").includes(c))) fails.push("onlyChanged");
	if (L.forbidChanged && changed.includes(L.forbidChanged)) fails.push("forbidChanged");
	if (L.readFirst && !uses.some((u: any) => /^(Read|Grep|Glob|Bash)$/.test(u.name))) fails.push("readFirst");
	if (L.consistent === "format-report" && /export const formatLabel/.test(rd("src/format.ts")) && /\blabel\b/.test(rd("src/report.ts"))) fails.push("inconsistent");
	if (L.judge && !(await judge(L.judge, f, r.text, calls(r.events), tag))) fails.push("judge");
	rmSync(dir, { recursive: true, force: true });
	const pass = fails.length === 0;
	return { pass, label: `${L.mode}/${L.kind}/${pass ? "ok" : "fail"}`, evidence: `${fails.join(",")} changed=[${changed.join(",")}] tools=${uses.map((u: any) => u.name).join(",")} | ${commands.join(" ; ").slice(0, 300)} | ${r.text.slice(0, 400)}`, tag };
};

export default { name: "task-12.1", grade, fixtures: { good: [], bad: [] } };
