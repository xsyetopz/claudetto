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

const stop = ($: Engine, reply = "Done.", tasks: [] | [unknown] = []) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: tasks as never,
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

test("nothing is removed while background work runs", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, { "": [{ command: MAKE("/tmp/probe-a") }] }, { [MARK("/tmp/probe-a")]: "S1" }, {}, runs);

	await stop($, "Done.", [{ id: "b1", type: "local_bash", status: "running", description: "x" }]);
	expect(runs).toEqual([]);
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
