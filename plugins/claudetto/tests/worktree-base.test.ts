import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const TIP = "b".repeat(40);
const BASE = "a".repeat(40);
const WORKTREE = "/repo/.claude/worktrees/agent-a1";

interface Git {
	readonly tip?: string;
	readonly base?: string;
	readonly contains?: boolean;
	readonly fails?: boolean;
}

const ran = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

/** Answers `git -C DIR ...` as a checkout at `/repo` on `feat` and its worktree would. */
const answer = (git: Git, argv: readonly string[]) => {
	if (git.fails === true) {
		return ran("", 128);
	}
	const [, , dir, ...rest] = argv;
	const command = rest.join(" ");
	if (command === "rev-parse --abbrev-ref HEAD") {
		return ran("feat\n");
	}
	if (command === "rev-parse HEAD") {
		return ran(`${dir === "/repo" ? (git.tip ?? TIP) : (git.base ?? BASE)}\n`);
	}
	if (command.startsWith("merge-base --is-ancestor")) {
		return ran("", git.contains === true ? 0 : 1);
	}
	return ran("", 1);
};

const lab = (on: On, git: Git = {}): { logs: string[]; runs: string[][] } => {
	const logs: string[] = [];
	const runs: string[][] = [];
	on("ui.log", (_$, e) => {
		logs.push(e.text);
		return { value: undefined };
	});
	on("classic.SubagentStart", () => ({}));
	on("classic.PostToolUse", () => ({}));
	on("process.run", (_$, e) => {
		runs.push([...e.argv]);
		return answer(git, e.argv);
	});
	return { logs, runs };
};

const start = ($: Engine, cwd = WORKTREE) =>
	$.classic.SubagentStart({
		agent_id: "a1",
		agent_type: "general-purpose",
		cwd,
	});

test("an agent worktree that lacks the tip of the checkout's branch is told the two commits and the command that joins them", async ($: Engine, on: On) => {
	const { logs } = lab(on);

	const out = await start($);

	const text = (out.additionalContext ?? []).join("\n");
	expect(text).toContain("`aaaaaaa`");
	expect(text).toContain("`feat`");
	expect(text).toContain("`bbbbbbb`");
	expect(text).toContain("`git merge --ff-only bbbbbbb`");
	expect(text).toContain("`worktree.baseRef`");
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain(WORKTREE);
	expect(logs[0]).toContain('`"head"`');
});

test("an agent worktree that holds the tip gets no text", async ($: Engine, on: On) => {
	const { logs } = lab(on, { contains: true });

	const out = await start($);

	expect(out.additionalContext ?? []).toEqual([]);
	expect(logs).toEqual([]);
});

test("an agent that runs in no worktree runs no `git`", async ($: Engine, on: On) => {
	const { logs, runs } = lab(on);

	const out = await start($, "/repo");

	expect(out.additionalContext ?? []).toEqual([]);
	expect(runs).toEqual([]);
	expect(logs).toEqual([]);
});

test("a `git` that fails leaves the agent's start as it was", async ($: Engine, on: On) => {
	const { logs } = lab(on, { fails: true });

	const out = await start($);

	expect(out.additionalContext ?? []).toEqual([]);
	expect(logs).toEqual([]);
});

test("`EnterWorktree` into a worktree that lacks the tip is told the same", async ($: Engine, on: On) => {
	const { logs } = lab(on);
	const path = "/repo/.claude/worktrees/probe";

	const out = await $.classic.PostToolUse({
		tool_name: "EnterWorktree",
		tool_input: { name: "probe" },
		tool_response: { worktreePath: path, worktreeBranch: "worktree-probe" },
		tool_use_id: "t1",
		cwd: path,
	});

	const text = (out.additionalContext ?? []).join("\n");
	expect(text).toContain("`git merge --ff-only bbbbbbb`");
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain(path);
});

test("another tool's result is left as it was", async ($: Engine, on: On) => {
	const { runs } = lab(on);

	const out = await $.classic.PostToolUse({
		tool_name: "Edit",
		tool_input: { file_path: "/repo/a.ts" },
		tool_response: {},
		tool_use_id: "t1",
		cwd: WORKTREE,
	});

	expect(out.additionalContext ?? []).toEqual([]);
	expect(runs).toEqual([]);
});
