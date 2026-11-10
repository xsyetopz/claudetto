import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { file, spawn, stdout, write } from "bun";

// Measures the texts a plugin sends to the model by driving its hooks with engine events, in a scratch copy of the plugin, so no source module is imported
// except for the one constant (AGENT_ROSTER) that no event reaches, which is read from its source line. Inputs are fixed: context 62% used, five-hour 41%, seven-day 93%.
const LAB = `
import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const bytes = (s: string): number => new TextEncoder().encode(s).length;
const emit = (name: string, value: number | string): void => console.log("PB " + name + "\\t" + value);
const absent = (name: string, why: unknown): void => emit(name, "absent (" + String(why).slice(0, 80) + ")");
const STOCK = "x".repeat(4000);
const TOOLS = ["Agent", "AskUserQuestion", "Bash", "Edit", "EnterPlanMode", "ExitPlanMode", "EnterWorktree", "ExitWorktree", "Glob", "Grep", "ListAgents", "Monitor", "NotebookEdit", "Read", "ReportFindings", "ScheduleWakeup", "SendMessage", "Skill", "TaskOutput", "TaskStop", "TodoWrite", "ToolSearch", "WebFetch", "WebSearch", "Workflow", "Write"];
const PROMPT = { text: "hi", wait: false, origin: { kind: "composer" } } as const;
const USAGE = {
	startedAt: 0,
	context: { tokens: 124000, window: 200000, percent: 62 },
	rateLimits: [{ kind: "five_hour", percentUsed: 41 }, { kind: "seven_day", percentUsed: 93 }],
};
const SHA = "a".repeat(40);
const TIP = "b".repeat(40);

test("measure-NN", async ($: Engine, on: On) => {
	try {
		const out = await $.prompt.compose({ model: "claude-opus-5-5", promptModel: "claude-opus-5-5", surfaces: ["terminal"], tools: ["Read", "Edit"], outputStyle: null, traits: [] });
		emit("root prompt", bytes(out.sections.map((s) => s.text).join("")));
	} catch (e) { absent("root prompt", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		on("tool.describe", (_$, e) => e);
		let total = 0;
		const named: string[] = [];
		for (const tool of TOOLS) {
			const out = await $.tool.describe({ tool, description: STOCK, provider: { plugin: "engine", tier: "core" } });
			if (out.description !== STOCK) {
				total += bytes(out.description);
				named.push(tool + "=" + bytes(out.description));
			}
		}
		if (named.length === 0) { absent("tool texts", "no tool text changed"); return; }
		emit("tool texts (" + named.length + " tools)", total);
		emit("tool texts detail", named.join(" "));
	} catch (e) { absent("tool texts", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		on("skill.prompt", (_$, e) => ({ text: e.text }));
		const out = await $.skill.prompt({ skill: "init", text: "Please analyze this codebase and create a CLAUDE.md file", source: "built-in" });
		emit("/init text", bytes(out.text));
	} catch (e) { absent("/init text", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		on("prompt.context", (_$, e) => e);
		const given = [{ name: "currentDate", text: "2026-10-29" }];
		const out = await $.prompt.context({ blocks: given });
		const added = out.blocks.slice(given.length);
		if (added.length === 0) { absent("context blocks added", "none"); return; }
		emit("context blocks added (" + added.map((b) => b.name).join(",") + ")", bytes(added.map((b) => b.text).join("")));
	} catch (e) { absent("context blocks added", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		on("prompt.submit", (_$, e) => e);
		on("session.usage", () => ({ value: USAGE }));
		const out = await $.prompt.submit(PROMPT);
		(out.context ?? []).forEach((line, i) => {
			const label = line.startsWith("Budget") ? "budget line" : line.startsWith("Seven-day") ? "seven-day slow text" : "context line " + (i + 1);
			emit(label, bytes(line));
		});
		if ((out.context ?? []).length === 0) { absent("budget line", "no context line"); }
	} catch (e) { absent("budget line", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		const git = (argv: readonly string[]) => {
			const rest = argv.slice(3).join(" ");
			const stdout = rest === "rev-parse --abbrev-ref HEAD" ? "feat/abc\\n" : rest === "rev-parse HEAD" ? (argv[2] === "/repo" ? TIP : SHA) + "\\n" : "";
			return { value: { exitCode: rest.startsWith("merge-base") ? 1 : 0, stdout, stderr: "", isStdoutTruncated: false, isStderrTruncated: false } };
		};
		on("ui.log", () => ({ value: undefined }));
		on("process.run", (_$, e) => git(e.argv));
		on("classic.SubagentStart", () => ({}));
		const out = await $.classic.SubagentStart({ agent_id: "a1", agent_type: "general-purpose", cwd: "/repo/.claude/worktrees/agent-a1", hook_event_name: "SubagentStart", session_id: "s", transcript_path: "/t" });
		const lines = out.additionalContext ?? [];
		if (lines.length === 0) { absent("worktree base line", "no context line"); }
		for (const line of lines) { emit("worktree base line", bytes(line)); }
	} catch (e) { absent("worktree base line", e); }
});


test("measure-NN", async ($: Engine, on: On) => {
	try {
		on("fs.exists", (_$, e) => ({ value: e.path.endsWith("/package.json") || e.path.endsWith("/bun.lock") }));
		on("env.get", () => ({ value: undefined }));
		on("store.get", () => ({ value: undefined }));
		on("store.set", () => ({ value: undefined }));
		on("ui.log", () => ({ value: undefined }));
		on("session.version", () => ({ value: { version: "2.1.318", base: "2.1.318", builtAt: "" } }));
		on("session.id", () => ({ value: "s" }));
		on("session.root", () => ({ value: "/repo" }));
		on("classic.SessionStart", () => ({}));
		const out = await $.classic.SessionStart({ source: "startup", cwd: "/repo" });
		const lines = out.additionalContext ?? [];
		if (lines.length === 0) { absent("bun rule", "no context line"); }
		for (const line of lines) { emit("bun rule", bytes(line)); }
	} catch (e) { absent("bun rule", e); }
});


expect(1).toBe(1);
`;

const pluginDir = process.argv[2];
if (!pluginDir) {
	throw new Error("usage: bun tools/prompt-bytes.ts <pluginDir>");
}

const SKIPPED = /\/(tests|node_modules|__tests__)(\/|$)/u;
const rosterBytes = (literal: string | undefined): number | string => {
	if (literal === undefined || literal === "") {
		return "absent";
	}
	const parsed: unknown = JSON.parse(literal);
	return typeof parsed === "string"
		? new TextEncoder().encode(parsed).length
		: "absent";
};
const ROSTER = /export const AGENT_ROSTER =\s*("(?:[^"\\]|\\.)*")/u;

const scratch = await mkdtemp(join(tmpdir(), "prompt-bytes-"));
try {
	const copy = join(scratch, "plugin");
	await cp(resolve(pluginDir), copy, {
		recursive: true,
		filter: (src) => !SKIPPED.test(src),
	});
	await mkdir(join(copy, "tests"));
	await writeFile(join(copy, "tests", "measure.test.ts"), LAB);
	const proc = spawn(["claude", "plugin", "test", copy], {
		env: { ...process.env, DISABLE_TELEMETRY: "1" },
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const [out, err] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;
	const rows = `${out}\n${err}`
		.split("\n")
		.filter((l) => l.startsWith("PB "))
		.map((l) => l.slice(3).split("\t"));
	const lines = [`plugin ${resolve(pluginDir)}`];
	for (const [name = "", value = ""] of rows) {
		const n = Number(value);
		lines.push(
			`${name.padEnd(48)}${Number.isNaN(n) ? value : n.toLocaleString("en-US")}`,
		);
	}
	const roster = ROSTER.exec(
		await file(join(resolve(pluginDir), "src/blocks/tool-describe/texts.ts"))
			.text()
			.catch(() => ""),
	);
	lines.push(
		`${"AGENT_ROSTER (source constant)".padEnd(48)}${rosterBytes(roster?.[1])}`,
	);
	if (rows.length === 0) {
		lines.push(`no measurement printed:\n${out}${err}`);
	}
	await write(stdout, `${lines.join("\n")}\n`);
} finally {
	await rm(scratch, { recursive: true, force: true });
}
