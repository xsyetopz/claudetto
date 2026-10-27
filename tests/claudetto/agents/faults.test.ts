// The fault tests of the claudetto agents (task 2.1 of change `0-3-0`).
// Each test names its fault of `.claude/claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.

import { expect, test } from "bun:test";
import { front, ROSTER, tools } from "../../support/agents.ts";

test("faults 5 and 9: the core plugin ships the agents of the roster", async () => {
	const fronts = await Promise.all(ROSTER.map((name) => front(name)));
	for (const [i, fm] of fronts.entries()) {
		expect(fm, ROSTER[i]).not.toBeNull();
	}
});

test("F02: no agent of the roster has a turn limit", async () => {
	const fronts = await Promise.all(ROSTER.map((name) => front(name)));
	for (const [i, fm] of fronts.entries()) {
		expect(fm, ROSTER[i]).not.toBeNull();
		expect(fm, ROSTER[i]).not.toHaveProperty("maxTurns");
	}
});

test("F01: no agent of the roster runs in a worktree by default", async () => {
	const fronts = await Promise.all(ROSTER.map((name) => front(name)));
	for (const [i, fm] of fronts.entries()) {
		expect(fm, ROSTER[i]).not.toBeNull();
		expect(fm, ROSTER[i]).not.toHaveProperty("isolation");
	}
});

test("F16: the reviewer does not run on Opus", async () => {
	expect(String((await front("Athena"))?.["model"] ?? "opus")).not.toContain(
		"opus",
	);
});

test("fault 9: the search agent cannot edit, write, or start an agent", async () => {
	const scout = await tools("Artemis");
	expect(scout).toContain("Read");
	for (const tool of ["Edit", "Write", "Agent"]) {
		expect(scout).not.toContain(tool);
	}
});
