import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { agentPath, ARMED, lab, MONITOR, SHELL, stop } from "./cleanup.mock.ts";

/** The git calls that change the repo, without the calls that only read it. */
const gitChanges = (runs: string[][]) =>
	runs.filter(
		(argv) =>
			argv[0] === "git" &&
			!["show-ref", "cherry", "status"].includes(argv[1] ?? "") &&
			argv[2] !== "list",
	);

const SUBAGENT = {
	id: "s9",
	type: "subagent",
	status: "running",
	description: "w",
};
const DONE = "agent-a0000000000000001";
const AHEAD = "agent-a0000000000000002";
const HELD = "agent-a0000000000000003";

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
		SUBAGENT,
	]);
	expect(out.block).toBeUndefined();
	expect(gitChanges(runs)).toEqual([]);
});

// Seen in another project: a lead that always had a worker running left 49 worktrees of 95 GiB, 23 of them with every commit already in its branch.
test("an integrated worker worktree goes while another worker still runs", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const agent = { tool: "Agent", command: "", text: "agentId: s9" };
	lab(
		on,
		{ "": [agent] },
		[],
		{ agents: { [DONE]: "free", [AHEAD]: "ahead", [HELD]: "locked" } },
		runs,
	);

	const out = await stop($, "Waiting on s9.", [SUBAGENT]);
	expect(out.block).toBeUndefined();
	expect(gitChanges(runs)).toEqual([
		["git", "worktree", "remove", agentPath(DONE)],
		["git", "branch", "-D", `worktree-${DONE}`],
	]);
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

test("an integrated worker worktree and a merged branch go; a dirty worktree, an unmerged branch, and a worker worktree with new commits stay and the stop names them", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const dirty = "/w/feat";
	lab(
		on,
		{
			"": [
				{ tool: "Agent", command: "", text: `agentId: ${AHEAD.slice(6)}` },
				{ command: `git worktree add -b feat ${dirty}` },
				{ command: "git worktree add /w/moved" },
				{ command: "git branch spike" },
				{ command: "git branch old" },
			],
		},
		[dirty],
		{
			dirty: [dirty, "/w/moved"],
			unmerged: ["feat", "spike"],
			gone: ["old"],
			agents: { [DONE]: "free", [AHEAD]: "ahead" },
		},
		runs,
	);

	const out = await stop($);
	expect(gitChanges(runs)).toEqual([
		["git", "worktree", "remove", agentPath(DONE)],
		["git", "branch", "-D", `worktree-${DONE}`],
		["git", "worktree", "remove", dirty],
		["git", "worktree", "remove", "/w/moved"],
		["git", "branch", "-d", "feat"],
		["git", "branch", "-d", "spike"],
		["git", "branch", "-d", "old"],
	]);
	for (const held of [dirty, "feat", "spike", agentPath(AHEAD)]) {
		expect(out.block).toContain(`\`${held}\``);
	}
});

// Seen in a dry run: 12 worktrees with uncommitted changes that earlier sessions left in one project would have blocked each stop there.
test("a worker worktree with new commits that this session did not start stays and the stop does not name it", async ($: Engine, on: On) => {
	lab(on, {}, [], { agents: { [AHEAD]: "ahead" } });

	const out = await stop($);
	expect(out.block).toBeUndefined();
});

test("a stop whose reply names every leftover passes", async ($: Engine, on: On) => {
	lab(on, { "": [{ command: "git branch spike" }] }, [], {
		unmerged: ["spike"],
	});

	const awaited2 = await stop($, "Branch spike holds two unmerged commits.");
	expect(awaited2.block).toBeUndefined();
});
