import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanned } from "./secrets.mock.ts";

interface Call {
	command: string;
	text?: string;
	tool?: string;
}

/** A repo at /repo where `dirty` worktrees and `unmerged` branches refuse plain removal, and so does each `gone` branch, which no longer exists; `past` maps an agent id ("" for the main loop) to its calls; `files` holds each existing path and its content. */
const lab = (
	on: On,
	past: Record<string, Call[]>,
	files: Record<string, string>,
	state: { dirty?: string[]; unmerged?: string[]; gone?: string[] } = {},
	runs: string[][] = [],
) => {
	const exit = (code: number) => ({
		value: {
			exitCode: code,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	});
	on("process.run", (_$, e) => {
		const found = scanned(e);
		if (found) {
			return found;
		}
		runs.push([...e.argv]);
		const [, verb, , target = ""] = e.argv;
		if (verb === "worktree") {
			return exit(state.dirty?.includes(target) ? 1 : 0);
		}
		if (verb === "branch") {
			return exit([...(state.unmerged ?? []), ...(state.gone ?? [])].includes(target) ? 1 : 0);
		}
		if (verb === "show-ref") {
			return exit(state.unmerged?.some((b) => e.argv.at(-1) === `refs/heads/${b}`) ? 0 : 1);
		}
		return exit(0);
	});
	on("classic.Stop", () => ({}));
	on("classic.SubagentStop", () => ({}));
	on("session.id", () => ({ value: "S1" }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("tool.list", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", (_$, e) => ({ value: e.path in files }));
	on("fs.read", (_$, e) => ({ value: files[e.path] ?? "" }));
	on("session.messages", (_$, e) => ({
		value: [
			{
				role: "assistant",
				text: "",
				toolUses: (past[e?.agentId ?? ""] ?? []).map((p, i) => ({
					tool: p.tool ?? "Bash",
					tool_use_id: `${i}`,
					input: { command: p.command },
					text: p.text ?? "",
				})),
			},
		],
	}));
};

const stop = ($: Engine, reply = "Done.", tasks: never[] = []) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: tasks,
	});

const MARK = (top: string) => `${top}/.created-by-claudetto`;
const MAKE = (top: string) =>
	`mkdir -p ${top} && printenv CLAUDE_CODE_SESSION_ID > ${top}/.created-by-claudetto`;
const removed = (runs: string[][]) =>
	runs.filter((argv) => argv[0] === "rm").map((argv) => argv.at(-1));

test("at the closing stop the session's marked /tmp folders go, and a sibling's named folder stays", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(
		on,
		{
			"": [
				{ command: MAKE("/tmp/probe-a") },
				{
					command: 'd=$(mktemp -d /tmp/probe-XXXX) && printenv CLAUDE_CODE_SESSION_ID > "$d/.created-by-claudetto" && echo "$d"',
					text: "/tmp/probe-Q1w2\n",
				},
				{ command: `ls /tmp/probe-sibling && ${MAKE("/tmp/probe-b")}` },
				{ command: "mktemp -d /tmp/probe-XXXX; find /tmp -name 'probe-sib*'", text: "/tmp/probe-sib2\n" },
				{ command: MAKE("/tmp/probe-other") },
			],
		},
		{
			[MARK("/tmp/probe-a")]: "S1\n",
			[MARK("/tmp/probe-Q1w2")]: "S1\n",
			[MARK("/tmp/probe-b")]: "S1\n",
			[MARK("/tmp/probe-sibling")]: "S1\n",
			[MARK("/tmp/probe-sib2")]: "S1\n",
			[MARK("/tmp/probe-other")]: "S2\n",
		},
		{},
		runs,
	);

	expect((await stop($)).block).toBeUndefined();
	expect(removed(runs)).toEqual(["/tmp/probe-a", "/tmp/probe-Q1w2", "/tmp/probe-b"]);
});

const MONITOR = { id: "m7", type: "monitor", status: "running", description: "build end" };
const SHELL = { id: "b1", type: "shell", status: "running", description: "dev server" };
const ARMED = [
	{ command: MAKE("/tmp/probe-a") },
	{ tool: "mcp__claudetto__monitor", command: "", text: "Monitor started (task m7, timeout 300000ms)." },
	{ command: "bun run dev", text: "Command running in background with ID: b1. Output is being written to: /t/b1" },
];

// Seen in another session: a monitor armed for a build outlived the report and woke the session 30 minutes later.
test("the agent's own shell and monitor that the reply does not name block the stop, and nothing is removed", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, { "": ARMED }, { [MARK("/tmp/probe-a")]: "S1" }, {}, runs);

	const out = await stop($, "Done.", [MONITOR, SHELL] as never);
	expect(out.block).toContain("`m7`");
	expect(out.block).toContain("`b1`");
	expect(out.block).toContain("TaskStop");
	expect(runs).toEqual([]);
});

test("a task the reply names, or a background subagent, is waited on: no block and nothing removed", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const agent = { tool: "Agent", command: "", text: "Async agent launched successfully.\nagentId: s9" };
	lab(on, { "": [...ARMED, agent] }, { [MARK("/tmp/probe-a")]: "S1" }, {}, runs);

	const out = await stop($, "Waiting on m7 and b1 for the build.", [
		MONITOR,
		SHELL,
		{ id: "s9", type: "subagent", status: "running", description: "w" },
	] as never);
	expect(out.block).toBeUndefined();
	expect(runs).toEqual([]);
});

test("a stop the hook already blocked passes with the task still running", async ($: Engine, on: On) => {
	lab(on, { "": ARMED }, { [MARK("/tmp/probe-a")]: "S1" });

	const out = await $.classic.Stop({
		stop_hook_active: true,
		last_assistant_message: "Done.",
		background_tasks: [MONITOR] as never,
	});
	expect(out.block).toBeUndefined();
});

test("a worker's stop ignores a task only the lead started and removes the worker's folders", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, { "": ARMED, w1: [{ command: MAKE("/tmp/probe-w1") }] }, { [MARK("/tmp/probe-w1")]: "S1" }, {}, runs);

	const out = await $.classic.SubagentStop({
		stop_hook_active: false,
		agent_id: "w1",
		agent_type: "general-purpose",
		agent_transcript_path: "/t",
		last_assistant_message: "Done.",
		background_tasks: [MONITOR, SHELL] as never,
	});
	expect(out.block).toBeUndefined();
	expect(removed(runs)).toEqual(["/tmp/probe-w1"]);
});

const WORKER = {
	tool: "Agent",
	command: "",
	text: "Agent finished.\nagentId: a1b2c3 (internal ID)",
};

test("a clean worker worktree and its merged branch go; a dirty worktree and an unmerged branch stay and the stop names them", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const dirty = "/w/feat";
	lab(
		on,
		{
			"": [
				WORKER,
				{ command: `git worktree add -b feat ${dirty}` },
				{ command: "git worktree add /w/moved" },
				{ command: "git branch spike" },
				{ command: "git branch old" },
			],
		},
		{ [dirty]: "" },
		{ dirty: [dirty, "/w/moved"], unmerged: ["feat", "spike"], gone: ["old"] },
		runs,
	);

	const out = await stop($);
	expect(runs.filter((argv) => argv[0] === "git" && argv[1] !== "show-ref")).toEqual([
		["git", "worktree", "remove", dirty],
		["git", "worktree", "remove", "/w/moved"],
		["git", "worktree", "remove", "/repo/.claude/worktrees/agent-a1b2c3"],
		["git", "branch", "-d", "feat"],
		["git", "branch", "-d", "spike"],
		["git", "branch", "-d", "old"],
		["git", "branch", "-d", "worktree-agent-a1b2c3"],
	]);
	expect(out.block).toContain(`hold work: \`${dirty}\`, \`feat\`, \`spike\`. A worktree`);
});

test("a stop whose reply names every leftover passes", async ($: Engine, on: On) => {
	lab(on, { "": [{ command: "git branch spike" }] }, {}, { unmerged: ["spike"] });

	expect((await stop($, "Branch spike holds two unmerged commits.")).block).toBeUndefined();
});

test("a worker's last turn removes only its own folders, not the lead's or a sibling's", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(
		on,
		{
			"": [{ command: MAKE("/tmp/probe-lead") }],
			w1: [{ command: MAKE("/tmp/probe-w1") }],
			w2: [{ command: MAKE("/tmp/probe-w2") }],
		},
		Object.fromEntries(["lead", "w1", "w2"].map((n) => [MARK(`/tmp/probe-${n}`), "S1"])),
		{},
		runs,
	);

	await $.classic.SubagentStop({
		stop_hook_active: false,
		agent_id: "w1",
		agent_type: "general-purpose",
		agent_transcript_path: "/t",
		last_assistant_message: "Done.",
		background_tasks: [],
	});
	expect(removed(runs)).toEqual(["/tmp/probe-w1"]);
});
