import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { ARMED, lab, MONITOR, SHELL, stop } from "./cleanup.mock.ts";

/** The git calls that change the repo, without the read-only `show-ref` probes. */
const gitChanges = (runs: string[][]) =>
	runs.filter((argv) => argv[0] === "git" && argv[1] !== "show-ref");

// Seen in another session: a monitor armed for a build outlived the report and woke the session 30 minutes later.
test("the agent's own shell and monitor that the reply does not name block the stop, and nothing is removed", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, { "": ARMED }, [], {}, runs);

	const out = await stop($, "Done.", [MONITOR, SHELL]);
	expect(out.block).toContain("`m7`");
	expect(out.block).toContain("`b1`");
	expect(runs).toEqual([]);
});

test("a task the reply names, or a background subagent, is waited on: no block and nothing removed", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const agent = {
		tool: "Agent",
		command: "",
		text: "Async agent launched successfully.\nagentId: s9",
	};
	lab(on, { "": [...ARMED, agent] }, [], {}, runs);

	const out = await stop($, "Waiting on m7 and b1 for the build.", [
		MONITOR,
		SHELL,
		{ id: "s9", type: "subagent", status: "running", description: "w" },
	]);
	expect(out.block).toBeUndefined();
	expect(runs).toEqual([]);
});

test("a stop the hook already blocked passes with the task still running", async ($: Engine, on: On) => {
	lab(on, { "": ARMED });

	const out = await $.classic.Stop({
		stop_hook_active: true,
		last_assistant_message: "Done.",
		background_tasks: [MONITOR],
	});
	expect(out.block).toBeUndefined();
});

test("a worker's stop ignores a task only the lead started and removes only its own worktree, not the lead's or a sibling's", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(
		on,
		{
			"": ARMED,
			w1: [{ command: "git worktree add /w/w1" }],
			w2: [{ command: "git worktree add /w/w2" }],
		},
		[],
		{},
		runs,
	);

	const out = await $.classic.SubagentStop({
		stop_hook_active: false,
		agent_id: "w1",
		agent_type: "general-purpose",
		agent_transcript_path: "/t",
		last_assistant_message: "Done.",
		background_tasks: [MONITOR, SHELL],
	});
	expect(out.block).toBeUndefined();
	expect(gitChanges(runs)).toEqual([["git", "worktree", "remove", "/w/w1"]]);
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
		[dirty],
		{ dirty: [dirty, "/w/moved"], unmerged: ["feat", "spike"], gone: ["old"] },
		runs,
	);

	const out = await stop($);
	expect(gitChanges(runs)).toEqual([
		["git", "worktree", "remove", dirty],
		["git", "worktree", "remove", "/w/moved"],
		["git", "worktree", "remove", "/repo/.claude/worktrees/agent-a1b2c3"],
		["git", "branch", "-d", "feat"],
		["git", "branch", "-d", "spike"],
		["git", "branch", "-d", "old"],
		["git", "branch", "-d", "worktree-agent-a1b2c3"],
	]);
	for (const held of [dirty, "feat", "spike"]) {
		expect(out.block).toContain(`\`${held}\``);
	}
});

test("a stop whose reply names every leftover passes", async ($: Engine, on: On) => {
	lab(on, { "": [{ command: "git branch spike" }] }, [], {
		unmerged: ["spike"],
	});

	const awaited2 = await stop($, "Branch spike holds two unmerged commits.");
	expect(awaited2.block).toBeUndefined();
});
