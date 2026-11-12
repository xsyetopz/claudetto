import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { bash } from "../secrets.mock.ts";
import { gateWorktreeRemove } from "../texts-gate.ts";
import { lab } from "./processes.mock.ts";

const created = ($: Engine, on: On, name: string) => {
	on("classic.WorktreeCreate", () => ({}));
	return $.classic.WorktreeCreate({
		session_id: "S1",
		transcript_path: "/t",
		cwd: "/p",
		name,
	});
};

test("a worktree Claude Code made for an agent is owned, with its branch", async ($: Engine, on: On) => {
	lab(on);
	await created($, on, "agent-a1b2c3");

	const path = await bash(
		$,
		"git worktree remove --force .claude/worktrees/agent-a1b2c3",
	);
	const branch = await bash($, "git branch -D worktree-agent-a1b2c3");

	expect(path.decision).toBe("allow");
	expect(branch.decision).toBe("allow");
});

test("a worktree EnterWorktree made is owned by its name", async ($: Engine, on: On) => {
	lab(on);
	await created($, on, "probe-ew");

	const v = await bash($, "git worktree remove /p/.claude/worktrees/probe-ew");

	expect(v.decision).toBe("allow");
});

test("a worktree no event named is denied as not owned, and so is its branch", async ($: Engine, on: On) => {
	lab(on);
	await created($, on, "agent-a1b2c3");

	const path = await bash($, "git worktree remove .claude/worktrees/agent-zz9");
	const branch = await bash($, "git branch -D worktree-agent-zz9");

	expect(path.decision).toBe("deny");
	expect(path.reason).toContain(
		gateWorktreeRemove(".claude/worktrees/agent-zz9"),
	);
	expect(branch.decision).toBe("ask");
});

test("a worktree that a shell `git worktree add` made is not owned", async ($: Engine, on: On) => {
	lab(on, [{ command: "git worktree add /w/new", text: "" }]);

	const v = await bash($, "git worktree remove /w/new");

	expect(v.decision).toBe("deny");
	expect(v.reason).toContain(gateWorktreeRemove("/w/new"));
});

test("an owned worktree stays owned when the transcript holds no call that made it", async ($: Engine, on: On) => {
	lab(on, []);
	await created($, on, "agent-a1b2c3");

	const v = await bash($, "git worktree remove .claude/worktrees/agent-a1b2c3");

	expect(v.decision).toBe("allow");
});
