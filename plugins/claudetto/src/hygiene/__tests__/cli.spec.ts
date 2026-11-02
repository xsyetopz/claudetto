import { expect, test } from "bun:test";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs, reportText, rootsOf, runMain } from "../cli.ts";
import { folder } from "./helpers.ts";

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

test("the kind flags are read and allow 0", () => {
	expect(
		parseArgs([
			"--handoff-days",
			"0",
			"--session-days",
			"5",
			"--probe-minutes",
			"0",
		]),
	).toEqual({ dryRun: false, handoffDays: 0, sessionDays: 5, probeMinutes: 0 });
	expect(() => parseArgs(["--probe-minutes", "-1"])).toThrow("--probe-minutes");
	expect(() => parseArgs(["--handoff-days", "1.5"])).toThrow("--handoff-days");
	expect(() => parseArgs(["--session-days"])).toThrow("--session-days");
});

test("`--days` must be a whole number over 0, and an unknown argument is refused", () => {
	expect(() => parseArgs(["--days", "0"])).toThrow("--days");
	expect(() => parseArgs(["--days"])).toThrow("--days");
	expect(() => parseArgs(["--session"])).toThrow("--session");
	expect(() => parseArgs(["--force"])).toThrow("--force");
});

const AT = { cwd: "/work", now: 5, days: 30, home: "/home/u", temps: [] };

test("the roots hold the temp roots found, and the home folder", () => {
	const at = { ...AT, temps: ["/tmp/claude-501"] };
	expect(rootsOf({ dryRun: false }, ENV, at).temps).toEqual([
		"/tmp/claude-501",
	]);
	expect(rootsOf({ dryRun: false }, ENV, at).home).toBe("/home/u");
});

test("the sessions folder is under `CLAUDE_CONFIG_DIR` when set, else `~/.claude`", () => {
	expect(rootsOf({ dryRun: false }, ENV, AT).sessions).toBe(
		"/home/u/.claude/sessions",
	);
	expect(
		rootsOf({ dryRun: false }, { ...ENV, CLAUDE_CONFIG_DIR: "/c" }, AT)
			.sessions,
	).toBe("/c/sessions");
});

test("`--session` and `--days` win over the env and the settings, and `--days` sets both day kinds", () => {
	const roots = rootsOf({ dryRun: true, session: "s1", days: 7 }, ENV, AT);
	expect(roots).toEqual({
		temps: [],
		project: "/work",
		sessions: "/home/u/.claude/sessions",
		current: "s1",
		handoffDays: 7,
		sessionDays: 7,
		probeMinutes: 60,
		home: "/home/u",
		now: 5,
		dryRun: true,
	});
	expect(rootsOf({ dryRun: false }, ENV, AT).current).toBe("abc");
	expect(rootsOf({ dryRun: false }, ENV, AT).handoffDays).toBe(30);
});

test("a kind flag wins over `--days`, and 0 is kept as off", () => {
	const roots = rootsOf(
		{ dryRun: false, days: 7, handoffDays: 0, sessionDays: 3, probeMinutes: 0 },
		ENV,
		AT,
	);
	expect([roots.handoffDays, roots.sessionDays, roots.probeMinutes]).toEqual([
		0, 3, 0,
	]);
});

test("`main` sweeps the candidate folders it is given and refuses the home folder as project", async () => {
	const home = await realpath(await mkdtemp(join(tmpdir(), "hygiene-")));
	try {
		const uid = process.getuid?.() ?? 0;
		const temp = join(home, "base", `claude-${uid}`);
		const probe = await folder(join(temp, "fswatch-probe-x"), 2 * 60 * 60_000);
		const out = await runMain(["--dry-run"], {
			env: { HOME: home },
			home,
			cwd: home,
			bases: [join(home, "base")],
		});
		expect(out.code).toBe(0);
		expect(out.text).toContain(probe);
		expect(out.text).toContain(`refused ${home}`);
	} finally {
		await rm(home, { recursive: true, force: true });
	}
});

test("the report names each entry and the total, and a dry run says nothing was removed", () => {
	const removed = [
		{ row: "probe", path: "/t/a", bytes: 1500 },
		{ row: "handoff", path: "/w/h.md", bytes: 500 },
	];
	expect(reportText({ removed, refused: [] }, false)).toBe(
		`probe  /t/a  1500 B
handoff  /w/h.md  500 B
hygiene removed 2 entries, 2000 B.`,
	);
	expect(reportText({ removed, refused: [] }, true)).toEndWith(
		"hygiene would remove 2 entries, 2000 B. Nothing was removed.",
	);
	expect(reportText({ removed: [], refused: [] }, false)).toBe(
		"hygiene removed 0 entries, 0 B.",
	);
	expect(
		reportText(
			{ removed: [], refused: [{ root: "/h", reason: "is the home folder" }] },
			false,
		),
	).toStartWith("hygiene refused /h: is the home folder");
});
