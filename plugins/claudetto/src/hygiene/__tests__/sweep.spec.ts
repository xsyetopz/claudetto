import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type SweepRoots, sweep } from "../sweep.ts";
import { aged, exists, file, folder, scratch } from "./helpers.ts";

const DAY_MS = 86_400_000;
const LIVE = "11111111-1111-4111-8111-111111111111";
const CURRENT = "22222222-2222-4222-8222-222222222222";
const DEAD = "33333333-3333-4333-8333-333333333333";

let home = "";
let roots: SweepRoots;
let temp = "";

beforeEach(async () => {
	({ home, roots } = await scratch(CURRENT, LIVE));
	temp = roots.temps[0] ?? "";
});

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

test("a probe folder past an hour goes, and a younger one stays", async () => {
	const old = await folder(join(temp, "fswatch-probe-old"), 61 * 60_000);
	const young = await folder(join(temp, "fswatch-probe-new"), 59 * 60_000);

	const report = await sweep(roots);

	expect(await exists(old)).toBe(false);
	expect(await exists(young)).toBe(true);
	expect(report.removed.map((entry) => entry.path)).toEqual([old]);
});

test("a session folder past `cleanupPeriodDays` goes unless its session is live or current", async () => {
	const project = join(temp, "-work");
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
	const young = await folder(join(temp, "-work", DEAD), 29 * DAY_MS);

	await sweep(roots);

	expect(await exists(young)).toBe(true);
});

test("a folder that is not named as a session id is left, since no row lists it", async () => {
	const other = await folder(join(temp, "-work", "notes"), 90 * DAY_MS);
	const top = await file(join(temp, "lock"), 90 * DAY_MS);

	await sweep(roots);

	expect(await exists(other)).toBe(true);
	expect(await exists(top)).toBe(true);
});

test("a project folder left empty by the sweep goes too", async () => {
	const project = join(temp, "-gone");
	await folder(join(project, DEAD), 31 * DAY_MS);

	await sweep(roots);

	expect(await exists(project)).toBe(false);
});

test("a saved output past a day goes, and a younger one and other files stay", async () => {
	const dir = join(roots.project, ".claude/claudetto/output");
	await mkdir(dir, { recursive: true });
	const old = await file(join(dir, "output-toolu_1.txt"), 25 * 60 * 60_000);
	const young = await file(join(dir, "output-toolu_2.txt"), 23 * 60 * 60_000);
	const other = await file(join(dir, "notes.txt"), 90 * DAY_MS);

	await sweep(roots);

	expect(await exists(old)).toBe(false);
	expect(await exists(young)).toBe(true);
	expect(await exists(other)).toBe(true);
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

test("the handoff a resume reads back stays when its file time is the oldest", async () => {
	const dir = join(roots.project, ".claude/claudetto/handoffs");
	const read = await file(
		join(dir, "handoff-2026-09-01T00-00-00.md"),
		90 * DAY_MS,
	);
	const earlier = await file(
		join(dir, "handoff-2026-08-01T00-00-00.md"),
		60 * DAY_MS,
	);

	await sweep(roots);

	expect(await exists(read)).toBe(true);
	expect(await exists(earlier)).toBe(false);
});

test("a dry run lists what would go and removes nothing", async () => {
	const probe = await folder(join(temp, "fswatch-probe-old"), 2 * 60 * 60_000);
	const dead = await folder(join(temp, "-work", DEAD), 31 * DAY_MS);

	const report = await sweep({ ...roots, dryRun: true });

	expect(await exists(probe)).toBe(true);
	expect(await exists(dead)).toBe(true);
	expect(report.removed.map((entry) => entry.path)).toEqual([probe, dead]);
});

test("a missing temp root, sessions folder, or handoff folder gives an empty report", async () => {
	const report = await sweep({
		...roots,
		temps: [join(home, "none/tmp")],
		sessions: join(home, "none/sessions"),
		project: join(home, "none/project"),
	});

	expect(report.removed).toEqual([]);
});

test("each removed entry carries its row and its size in bytes", async () => {
	const probe = join(temp, "fswatch-probe-old");
	await mkdir(probe, { recursive: true });
	await writeFile(join(probe, "a"), "12345");
	await aged(probe, 2 * 60 * 60_000);

	const report = await sweep(roots);

	expect(report.removed).toEqual([{ row: "probe", path: probe, bytes: 5 }]);
});
