import { expect, test } from "bun:test";
import { parseArgs, reportText, rootsOf } from "../cli.ts";

const ENV = { HOME: "/home/u", CLAUDE_CODE_SESSION_ID: "abc" };

test("no argument is a real run with no session or days of its own", () => {
	expect(parseArgs([])).toEqual({ dryRun: false });
});

test("`--dry-run`, `--session`, and `--days` are read", () => {
	expect(parseArgs(["--dry-run", "--session", "s1", "--days", "7"])).toEqual({
		dryRun: true,
		session: "s1",
		days: 7,
	});
});

test("`--days` must be a whole number over 0, and an unknown argument is refused", () => {
	expect(() => parseArgs(["--days", "0"])).toThrow("--days");
	expect(() => parseArgs(["--days"])).toThrow("--days");
	expect(() => parseArgs(["--session"])).toThrow("--session");
	expect(() => parseArgs(["--force"])).toThrow("--force");
});

test("the temp root is `/tmp/claude-<uid>`, or under `CLAUDE_CODE_TMPDIR` when set", () => {
	const at = { uid: 501, cwd: "/work", now: 5, days: 30 };
	expect(rootsOf({ dryRun: false }, ENV, at).temp).toBe("/tmp/claude-501");
	expect(
		rootsOf({ dryRun: false }, { ...ENV, CLAUDE_CODE_TMPDIR: "/t/" }, at).temp,
	).toBe("/t/claude-501");
});

test("the sessions folder is under `CLAUDE_CONFIG_DIR` when set, else `~/.claude`", () => {
	const at = { uid: 501, cwd: "/work", now: 5, days: 30 };
	expect(rootsOf({ dryRun: false }, ENV, at).sessions).toBe(
		"/home/u/.claude/sessions",
	);
	expect(
		rootsOf({ dryRun: false }, { ...ENV, CLAUDE_CONFIG_DIR: "/c" }, at)
			.sessions,
	).toBe("/c/sessions");
});

test("`--session` and `--days` win over the env and the settings", () => {
	const at = { uid: 501, cwd: "/work", now: 5, days: 30 };
	const roots = rootsOf({ dryRun: true, session: "s1", days: 7 }, ENV, at);
	expect(roots).toEqual({
		temp: "/tmp/claude-501",
		project: "/work",
		sessions: "/home/u/.claude/sessions",
		current: "s1",
		days: 7,
		now: 5,
		dryRun: true,
	});
	expect(rootsOf({ dryRun: false }, ENV, at).current).toBe("abc");
	expect(rootsOf({ dryRun: false }, ENV, at).days).toBe(30);
});

test("the report names each entry and the total, and a dry run says nothing was removed", () => {
	const removed = [
		{ row: "probe", path: "/t/a", bytes: 1500 },
		{ row: "handoff", path: "/w/h.md", bytes: 500 },
	];
	expect(reportText({ removed }, false)).toBe(
		`probe  /t/a  1500 B
handoff  /w/h.md  500 B
hygiene removed 2 entries, 2000 B.`,
	);
	expect(reportText({ removed }, true)).toEndWith(
		"hygiene would remove 2 entries, 2000 B. Nothing was removed.",
	);
	expect(reportText({ removed: [] }, false)).toBe(
		"hygiene removed 0 entries, 0 B.",
	);
});
