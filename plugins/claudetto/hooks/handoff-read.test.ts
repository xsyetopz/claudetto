import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
	goal,
	handoffEntry,
	KEY,
	readBackLab,
	resume,
	startup,
	TRANSCRIPT,
} from "./handoff.mock.ts";

test("a resume reads the newest fresh handoff back once", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await resume($);
	await lab2.clock.advance(1);
	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(1);
	expect(lab2.submitted[0]).toContain("handoff-2026-01-02T00-00-00.md");
});

test("a file newer than the one taken is taken in as well", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await resume($);
	await lab2.clock.advance(1);
	lab2.entries.push(handoffEntry("03", 8 * 86_400_000 - 1000));
	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(2);
	expect(lab2.submitted[1]).toContain("handoff-2026-01-03T00-00-00.md");
});

test("a resume of a session whose transcript is newer than the handoff injects nothing", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, {}, { transcriptMs: 8 * 86_400_000 });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("a key in a handoff file is redacted before the read-back injects it", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, {}, { body: `## Goal\nuse ${KEY}` });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted[0]).not.toContain(KEY);
	expect(lab2.submitted[0]).toContain("[REDACTED]");
});

test("a handoff older than seven days is named in a log line and not injected", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 8 * 86_400_000);

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(lab2.lines.length).toBeGreaterThan(0);
});

test("a project with no handoff folder yet takes nothing in and shows no error", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { folder: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(lab2.lines).toEqual([]);
});

test("a session that starts fresh takes nothing in", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);

	await $.classic.SessionStart({
		source: "startup",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("a handoff inside the stale limit is taken in, and its text opens with the source of the file", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 6 * 86_400_000);

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toHaveLength(1);
	expect(
		lab2.submitted[0]?.startsWith("The handoff below was written by Claude"),
	).toBe(true);
});

test("a stale handoff is named once and not at every start", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 8 * 86_400_000);

	await resume($);
	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.lines.filter((line) => line.includes("days old"))).toHaveLength(
		1,
	);
});

test("a handoff file that cannot be read tells the user in one line", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { read: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(
		lab2.lines.filter((line) => line.includes("Failed to read a handoff")),
	).toHaveLength(1);
});

test("a submit the session refuses tells the user in one line and does not fail the start", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000, { submit: false });

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
	expect(
		lab2.lines.filter((line) => line.includes("Failed to inject handoff")),
	).toHaveLength(1);
});

test("a typed /clear takes no handoff in", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);
	on("classic.SessionEnd", () => ({}));

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });
	await $.classic.SessionStart({
		source: "clear",
		transcript_path: TRANSCRIPT,
	});
	await lab2.clock.advance(1);

	expect(lab2.submitted).toEqual([]);
});

test("the handoff folder is read under the project root after a shell cd", async ($: Engine, on: On) => {
	const lab2 = readBackLab(on, 60_000);
	on("session.cwd", () => ({ value: "/repo/openspec/changes/x" }));

	await resume($);
	await lab2.clock.advance(1);

	expect(lab2.asked).toEqual(["/repo/.claude/claudetto/handoffs"]);
});

const HANDOFF_INPUT = {
	goal: "ship the cut",
	standing: "none",
	state: "done: parser",
	decisions: "table over regex",
	next_prompt: "run the suite",
};

/** The commands `$.command.run` reached the engine with, after a handoff that ran its timer. */
const handedOff = async ($: Engine, on: On, goals: () => Promise<unknown>) => {
	const clock = mock.clock(on, { now: 0 });
	const ran: string[] = [];
	startup(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
	on("turn.abort", () => ({ value: undefined }));
	on("prompt.submit", (_$, e) => e);
	on("command.run", (_$, e) => {
		ran.push(`${e.command} ${e.args}`.trim());
		return {};
	});
	await goals();
	ran.length = 0;
	await $.tool.call({ tool: "mcp__claudetto__handoff", ...HANDOFF_INPUT });
	await clock.advance(1);
	return ran;
};

test("a handoff sets the user's goal again after the clear", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, () => goal($, "all tests pass"));

	expect(ran).toEqual(["clear", "goal all tests pass"]);
});

test("a handoff after /goal clear sets no goal", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, async () => {
		await goal($, "all tests pass");
		await goal($, "clear");
	});

	expect(ran).toEqual(["clear"]);
});

test("the last goal the user set is the one set again", async ($: Engine, on: On) => {
	const ran = await handedOff($, on, async () => {
		await goal($, "first");
		await goal($, "second");
	});

	expect(ran).toEqual(["clear", "goal second"]);
});
