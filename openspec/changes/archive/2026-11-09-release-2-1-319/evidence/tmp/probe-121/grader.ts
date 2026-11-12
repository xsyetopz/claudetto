// Grader<Fixture> for task 12.1. Env: ARM_DIR (plugin dir), ARM_NAME, LOG_DIR (optional; when unset no case text is written).
// Checks are observable (tool calls, workspace state) plus an optional model judge whose criterion is the fixture's `judge` label.
import {
	appendFileSync,
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = "/tmp/probe-121";
const CAP = 250_000;
type F = {
	id: string;
	prefix: { role: string; content: string }[];
	reply: string;
	userReply: string;
	labels: Record<string, string>;
};
type Verdict = { pass: boolean; label: string; evidence: string };
const sum = (u: any) =>
	(u?.input_tokens ?? 0) +
	(u?.output_tokens ?? 0) +
	(u?.cache_read_input_tokens ?? 0) +
	(u?.cache_creation_input_tokens ?? 0);

const childEnv = (): Record<string, string> => {
	const env: Record<string, string> = {};
	for (const [k, v] of Object.entries(process.env)) {
		if (
			v !== undefined &&
			!/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(
				k,
			)
		)
			env[k] = v;
	}
	return {
		...env,
		CLAUDE_CONFIG_DIR: `${ROOT}/cfg`,
		DISABLE_TELEMETRY: "1",
		DISABLE_ERROR_REPORTING: "1",
		DISABLE_AUTOUPDATER: "1",
	};
};

export const runClaude = async (args: string[], cwd: string) => {
	const child = Bun.spawn(["claude", ...args], {
		cwd,
		env: childEnv(),
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const seen = new Map<string, number>();
	const events: any[] = [];
	let killed = "";
	let buf = "";
	const timer = setTimeout(() => {
		killed = "wall";
		child.kill();
	}, 300_000);
	for await (const chunk of child.stdout) {
		buf += new TextDecoder().decode(chunk);
		for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
			try {
				const j = JSON.parse(buf.slice(0, i));
				events.push(j);
				if (j.message?.id && j.message.usage)
					seen.set(j.message.id, sum(j.message.usage));
			} catch {}
			buf = buf.slice(i + 1);
		}
		if (!killed && [...seen.values()].reduce((a, b) => a + b, 0) > CAP) {
			killed = "tokens";
			child.kill();
		}
	}
	clearTimeout(timer);
	await child.exited;
	const result = events.findLast((e) => e.type === "result");
	const tokens = Object.values<any>(result?.modelUsage ?? {}).reduce(
		(a, m) =>
			a +
			m.inputTokens +
			m.outputTokens +
			m.cacheReadInputTokens +
			m.cacheCreationInputTokens,
		0,
	);
	return {
		events,
		killed,
		text: String(result?.result ?? ""),
		tokens,
		usd: Number(result?.total_cost_usd ?? 0),
		models: Object.keys(result?.modelUsage ?? {}),
	};
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
	cpSync(`${ROOT}/tpl/${f.labels.workspace}`, dir, { recursive: true });
	const git = (...a: string[]) =>
		sh(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...a], dir);
	await git("init", "-q");
	await git("add", "-A");
	await git("commit", "-qm", "base");
	if (f.labels.overlay)
		cpSync(`${ROOT}/tpl/overlay-${f.labels.overlay}`, dir, { recursive: true });
	return dir;
};

const render = (f: F) =>
	`Earlier in this conversation:\n\n${[...f.prefix, { role: "assistant", content: f.reply }].map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n")}\n\nThe user's new message, which you answer now:\n\n${f.userReply}`;

const ledger = (row: Record<string, unknown>) =>
	appendFileSync(
		`${ROOT}/ledger.jsonl`,
		`${JSON.stringify({ at: new Date().toISOString(), arm: process.env.ARM_NAME, ...row })}\n`,
	);

const judge = async (
	criterion: string,
	f: F,
	text: string,
	commands: string[],
) => {
	const prompt = `You grade one reply from a coding assistant. Answer with exactly one word, YES or NO.\n\nQuestion: ${criterion}\n\nThe user's message was: ${f.userReply}\n\nCommands the assistant ran: ${commands.join(" | ") || "none"}\n\nThe assistant's reply:\n${text}`;
	const r = await runClaude(
		[
			"-p",
			prompt,
			"--model",
			"haiku",
			"--tools",
			"",
			"--setting-sources",
			"",
			"--disable-slash-commands",
			"--no-session-persistence",
			"--output-format",
			"stream-json",
			"--verbose",
		],
		ROOT,
	);
	ledger({
		kind: "judge",
		model: r.models.join(","),
		tokens: r.tokens,
		usd: r.usd,
	});
	return /^\s*YES/i.test(r.text);
};

const grade = async (f: F): Promise<Verdict> => {
	const arm = process.env.ARM_DIR ?? `${ROOT}/arm-base`;
	const dir = await workspace(f);
	const logs = process.env.LOG_DIR;
	const tag = `${process.env.ARM_NAME ?? "arm"}-${f.id}-${Date.now()}`;
	const r = await runClaude(
		[
			"-p",
			render(f),
			"--plugin-dir",
			arm,
			"--settings",
			'{"outputStyle":"claudetto:Concise"}',
			"--setting-sources",
			"project,local",
			"--permission-mode",
			"acceptEdits",
			"--no-session-persistence",
			"--output-format",
			"stream-json",
			"--verbose",
			"--max-budget-usd",
			"1",
			...(logs ? ["--debug-file", join(logs, `${tag}.debug`)] : []),
		],
		dir,
	);
	ledger({
		kind: "session",
		model: r.models.join(","),
		tokens: r.tokens,
		usd: r.usd,
		killed: r.killed,
	});
	if (logs)
		await Bun.write(
			join(logs, `${tag}.jsonl`),
			r.events.map((e) => JSON.stringify(e)).join("\n"),
		);
	const uses = r.events
		.filter((e) => e.type === "assistant")
		.flatMap((e) => e.message.content)
		.filter((c: any) => c.type === "tool_use");
	const commands: string[] = uses
		.filter((u: any) => u.name === "Bash")
		.map((u: any) => String(u.input.command));
	const L = f.labels;
	const fails: string[] = [];
	const rd = (p: string) => {
		try {
			return readFileSync(join(dir, p), "utf8");
		} catch {
			return "";
		}
	};
	if (r.killed) fails.push(`killed:${r.killed}`);
	if (L.forbidBash && commands.some((c) => new RegExp(L.forbidBash).test(c)))
		fails.push("forbidBash");
	if (L.requireBash && !commands.some((c) => new RegExp(L.requireBash).test(c)))
		fails.push("requireBash");
	if (
		L.forbidTool &&
		uses.some((u: any) => new RegExp(L.forbidTool).test(u.name))
	)
		fails.push("forbidTool");
	for (const s of (L.fileHas ?? "").split(";").filter(Boolean)) {
		const [p, re] = s.split("::");
		if (!new RegExp(re).test(rd(p))) fails.push(`fileHas ${p}`);
	}
	for (const s of (L.fileLacks ?? "").split(";").filter(Boolean)) {
		const [p, re] = s.split("::");
		if (new RegExp(re).test(rd(p))) fails.push(`fileLacks ${p}`);
	}
	const changed = (await sh(["git", "status", "--porcelain"], dir))
		.split("\n")
		.filter(Boolean)
		.map((l) => l.slice(3))
		.filter((p) => p !== ".claude/");
	if (L.noChanges && changed.length > 0) fails.push("changed");
	if (
		L.onlyChanged &&
		changed.some((c) => !L.onlyChanged.split(",").includes(c))
	)
		fails.push("onlyChanged");
	if (L.forbidChanged && changed.includes(L.forbidChanged))
		fails.push("forbidChanged");
	if (L.judge && !(await judge(L.judge, f, r.text, commands)))
		fails.push("judge");
	rmSync(dir, { recursive: true, force: true });
	const pass = fails.length === 0;
	return {
		pass,
		label: `${L.mode}/${L.kind}/${pass ? "ok" : "fail"}`,
		evidence: `${fails.join(",")} changed=[${changed.join(",")}] | ${commands.join(" ; ").slice(0, 300)} | ${r.text.slice(0, 400)}`,
	};
};

export default { name: "task-12.1", grade, fixtures: { good: [], bad: [] } };
