import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	ARMED,
	lab,
	MAKE,
	MARK,
	MONITOR,
	removed,
	SHELL,
	stop,
} from "./cleanup.mock.ts";

/** The git calls that change the repo, without the read-only `show-ref` probes. */
const gitChanges = (runs: string[][]) =>
	runs.filter((argv) => argv[0] === "git" && argv[1] !== "show-ref");

test("at the closing stop the session's marked /tmp folders go, and a sibling's named folder stays", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(
		on,
		{
			"": [
				{ command: MAKE("/tmp/probe-a") },
				{
					command:
						'd=$(mktemp -d /tmp/probe-XXXX) && printenv CLAUDE_CODE_SESSION_ID > "$d/.created-by-claudetto" && echo "$d"',
					text: "/tmp/probe-Q1w2\n",
				},
				{ command: `ls /tmp/probe-sibling && ${MAKE("/tmp/probe-b")}` },
				{
					command: "mktemp -d /tmp/probe-XXXX; find /tmp -name 'probe-sib*'",
					text: "/tmp/probe-sib2\n",
				},
				{ command: MAKE("/tmp/probe-other") },
				{
					command:
						"cd /tmp && mkdir probe-rel && printenv CLAUDE_CODE_SESSION_ID > probe-rel/.created-by-claudetto",
				},
				{
					command:
						'd=$(mktemp -d /tmp/probe-XXXX) && printenv CLAUDE_CODE_SESSION_ID > "$d/.created-by-claudetto" && echo "made $d."',
					text: "made /tmp/probe-dot.\n(/tmp/probe-par)\n",
				},
			],
		},
		{
			[MARK("/tmp/probe-rel")]: "S1\n",
			[MARK("/tmp/probe-dot")]: "S1\n",
			[MARK("/tmp/probe-par")]: "S1\n",
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

	const awaited = await stop($);
	expect(awaited.block).toBeUndefined();
	expect(removed(runs)).toEqual([
		"/tmp/probe-a",
		"/tmp/probe-Q1w2",
		"/tmp/probe-b",
		"/tmp/probe-rel",
		"/tmp/probe-dot",
		"/tmp/probe-par",
	]);
});

// Seen in another session: a monitor armed for a build outlived the report and woke the session 30 minutes later.
test("the agent's own shell and monitor that the reply does not name block the stop, and nothing is removed", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, { "": ARMED }, { [MARK("/tmp/probe-a")]: "S1" }, {}, runs);

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
	lab(
		on,
		{ "": [...ARMED, agent] },
		{ [MARK("/tmp/probe-a")]: "S1" },
		{},
		runs,
	);

	const out = await stop($, "Waiting on m7 and b1 for the build.", [
		MONITOR,
		SHELL,
		{ id: "s9", type: "subagent", status: "running", description: "w" },
	]);
	expect(out.block).toBeUndefined();
	expect(runs).toEqual([]);
});

test("a stop the hook already blocked passes with the task still running", async ($: Engine, on: On) => {
	lab(on, { "": ARMED }, { [MARK("/tmp/probe-a")]: "S1" });

	const out = await $.classic.Stop({
		stop_hook_active: true,
		last_assistant_message: "Done.",
		background_tasks: [MONITOR],
	});
	expect(out.block).toBeUndefined();
});

test("a worker's stop ignores a task only the lead started and removes the worker's folders", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(
		on,
		{ "": ARMED, w1: [{ command: MAKE("/tmp/probe-w1") }] },
		{ [MARK("/tmp/probe-w1")]: "S1" },
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

// Seen in a worker: its marked folder went with `rm -rf` and took the 41 staged files of the worktree inside it.
test("a marked /tmp folder that holds a dirty worktree stays, and the stop names the worktree", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	const top = "/tmp/probe-wt";
	const tree = `${top}/wt`;
	lab(
		on,
		{
			"": [
				{ command: MAKE(top) },
				{ command: `git worktree add -b fix ${tree}` },
			],
		},
		{ [MARK(top)]: "S1\n", [tree]: "" },
		{ dirty: [tree], unmerged: ["fix"] },
		runs,
	);

	const out = await stop($);

	expect(removed(runs)).not.toContain(top);
	expect(out.block).toContain(`\`${tree}\``);
});

test("a stop whose reply names every leftover passes", async ($: Engine, on: On) => {
	lab(
		on,
		{ "": [{ command: "git branch spike" }] },
		{},
		{ unmerged: ["spike"] },
	);

	const awaited2 = await stop($, "Branch spike holds two unmerged commits.");
	expect(awaited2.block).toBeUndefined();
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
		Object.fromEntries(
			["lead", "w1", "w2"].map((n) => [MARK(`/tmp/probe-${n}`), "S1"]),
		),
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
