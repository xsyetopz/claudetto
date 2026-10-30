import { afterEach, beforeEach, expect, test } from "bun:test";
import { lstat, mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type SweepRoots, sweep } from "../sweep.ts";

const NOW = Date.UTC(2026, 9, 30);
const DAY_MS = 86_400_000;
const LIVE = "11111111-1111-4111-8111-111111111111";
const CURRENT = "22222222-2222-4222-8222-222222222222";
const DEAD = "33333333-3333-4333-8333-333333333333";

let home = "";
let roots: SweepRoots;

const exists = async (path: string): Promise<boolean> => {
	try {
		await lstat(path);
		return true;
	} catch {
		return false;
	}
};

const aged = async (path: string, ageMs: number): Promise<string> => {
	const at = new Date(NOW - ageMs);
	await utimes(path, at, at);
	return path;
};

const folder = async (path: string, ageMs: number): Promise<string> => {
	await mkdir(path, { recursive: true });
	return aged(path, ageMs);
};

const file = async (path: string, ageMs: number): Promise<string> => {
	await writeFile(path, "x");
	return aged(path, ageMs);
};

beforeEach(async () => {
	home = await mkdtemp(join(tmpdir(), "hygiene-"));
	roots = {
		temp: join(home, "tmp/claude-501"),
		project: join(home, "work"),
		sessions: join(home, "claude/sessions"),
		current: CURRENT,
		days: 30,
		now: NOW,
		dryRun: false,
	};
	await mkdir(roots.sessions, { recursive: true });
	await writeFile(
		join(roots.sessions, "1.json"),
		JSON.stringify({ sessionId: LIVE, pid: 1 }),
	);
	await mkdir(join(roots.project, ".claude/claudetto/handoffs"), {
		recursive: true,
	});
});

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

test("a probe folder past an hour goes, and a younger one stays", async () => {
	const old = await folder(join(roots.temp, "fswatch-probe-old"), 61 * 60_000);
	const young = await folder(
		join(roots.temp, "fswatch-probe-new"),
		59 * 60_000,
	);

	const report = await sweep(roots);

	expect(await exists(old)).toBe(false);
	expect(await exists(young)).toBe(true);
	expect(report.removed.map((entry) => entry.path)).toEqual([old]);
});

test("a session folder past `cleanupPeriodDays` goes unless its session is live or current", async () => {
	const project = join(roots.temp, "-work");
	const dead = await folder(join(project, DEAD), 31 * DAY_MS);
	const live = await folder(join(project, LIVE), 31 * DAY_MS);
	const current = await folder(join(project, CURRENT), 31 * DAY_MS);
	await aged(project, 31 * DAY_MS);

	await sweep(roots);

	expect(await exists(dead)).toBe(false);
	expect(await exists(live)).toBe(true);
	expect(await exists(current)).toBe(true);
});

test("a session folder younger than `cleanupPeriodDays` stays", async () => {
	const young = await folder(join(roots.temp, "-work", DEAD), 29 * DAY_MS);

	await sweep(roots);

	expect(await exists(young)).toBe(true);
});

test("a folder that is not named as a session id is left, since no row lists it", async () => {
	const other = await folder(join(roots.temp, "-work", "notes"), 90 * DAY_MS);
	const top = await file(join(roots.temp, "lock"), 90 * DAY_MS);

	await sweep(roots);

	expect(await exists(other)).toBe(true);
	expect(await exists(top)).toBe(true);
});

test("a project folder left empty by the sweep goes too", async () => {
	const project = join(roots.temp, "-gone");
	await folder(join(project, DEAD), 31 * DAY_MS);

	await sweep(roots);

	expect(await exists(project)).toBe(false);
});

test("old handoffs go and the newest stays, even when it is old too", async () => {
	const dir = join(roots.project, ".claude/claudetto/handoffs");
	const oldest = await file(
		join(dir, "handoff-2026-08-01T00-00-00.md"),
		90 * DAY_MS,
	);
	const older = await file(
		join(dir, "handoff-2026-08-20T00-00-00.md"),
		70 * DAY_MS,
	);
	const newest = await file(
		join(dir, "handoff-2026-09-01T00-00-00.md"),
		59 * DAY_MS,
	);
	const notes = await file(join(dir, "notes.md"), 90 * DAY_MS);

	await sweep(roots);

	expect(await exists(oldest)).toBe(false);
	expect(await exists(older)).toBe(false);
	expect(await exists(newest)).toBe(true);
	expect(await exists(notes)).toBe(true);
});

test("a dry run lists what would go and removes nothing", async () => {
	const probe = await folder(
		join(roots.temp, "fswatch-probe-old"),
		2 * 60 * 60_000,
	);
	const dead = await folder(join(roots.temp, "-work", DEAD), 31 * DAY_MS);

	const report = await sweep({ ...roots, dryRun: true });

	expect(await exists(probe)).toBe(true);
	expect(await exists(dead)).toBe(true);
	expect(report.removed.map((entry) => entry.path)).toEqual([probe, dead]);
});

test("a missing temp root, sessions folder, or handoff folder gives an empty report", async () => {
	const report = await sweep({
		...roots,
		temp: join(home, "none/tmp"),
		sessions: join(home, "none/sessions"),
		project: join(home, "none/project"),
	});

	expect(report.removed).toEqual([]);
});

test("each removed entry carries its row and its size in bytes", async () => {
	const probe = join(roots.temp, "fswatch-probe-old");
	await mkdir(probe, { recursive: true });
	await writeFile(join(probe, "a"), "12345");
	await aged(probe, 2 * 60 * 60_000);

	const report = await sweep(roots);

	expect(report.removed).toEqual([{ row: "probe", path: probe, bytes: 5 }]);
});
