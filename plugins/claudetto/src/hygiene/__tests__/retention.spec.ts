import { afterEach, beforeEach, expect, test } from "bun:test";
import { rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { type SweepRoots, sweep } from "../sweep.ts";
import { exists, file, folder, scratch } from "./helpers.ts";

const DAY_MS = 86_400_000;
const DEAD = "33333333-3333-4333-8333-333333333333";

let home = "";
let roots: SweepRoots;
let dir = "";

beforeEach(async () => {
	({ home, roots } = await scratch("current", "live"));
	dir = join(roots.project, ".claude/claudetto/handoffs");
});

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

test("legacy-named handoffs past the limit go, and the name the reader takes stays", async () => {
	const legacy = await file(
		join(dir, "handoff-20261028T160024Z.md"),
		60 * DAY_MS,
	);
	const odd = await file(join(dir, "handoff-20261030T-9-2.md"), 60 * DAY_MS);
	const read = await file(
		join(dir, "handoff-2026-09-01T00-00-00.md"),
		90 * DAY_MS,
	);

	await sweep(roots);

	expect(await exists(legacy)).toBe(false);
	expect(await exists(odd)).toBe(false);
	expect(await exists(read)).toBe(true);
});

test("a file that is not a handoff name and a symlink named `handoff-x.md` stay", async () => {
	const status = await file(join(dir, "0-1-1-status-line.md"), 60 * DAY_MS);
	const target = await file(join(home, "target.md"), 60 * DAY_MS);
	const link = join(dir, "handoff-x.md");
	await symlink(target, link);

	await sweep(roots);

	expect(await exists(status)).toBe(true);
	expect(await exists(link)).toBe(true);
	expect(await exists(target)).toBe(true);
});

test("a `probeMinutes` of 0 keeps a day-old probe while the other kinds are swept", async () => {
	const temp = roots.temps[0] ?? "";
	const probe = await folder(join(temp, "fswatch-probe-old"), DAY_MS);
	const dead = await folder(join(temp, "-work", DEAD), 31 * DAY_MS);

	await sweep({ ...roots, probeMinutes: 0 });

	expect(await exists(probe)).toBe(true);
	expect(await exists(dead)).toBe(false);
});

test("a `handoffDays` of 0 keeps old handoffs and a `sessionDays` of 0 keeps old session folders", async () => {
	const temp = roots.temps[0] ?? "";
	const old = await file(
		join(dir, "handoff-2026-08-01T00-00-00.md"),
		90 * DAY_MS,
	);
	await file(join(dir, "handoff-2026-09-01T00-00-00.md"), 59 * DAY_MS);
	const dead = await folder(join(temp, "-work", DEAD), 90 * DAY_MS);
	const probe = await folder(join(temp, "fswatch-probe-old"), DAY_MS);

	await sweep({ ...roots, handoffDays: 0, sessionDays: 0 });

	expect(await exists(old)).toBe(true);
	expect(await exists(dead)).toBe(true);
	expect(await exists(probe)).toBe(false);
});

test("each kind uses its own limit", async () => {
	const temp = roots.temps[0] ?? "";
	const handoff = await file(
		join(dir, "handoff-2026-08-01T00-00-00.md"),
		10 * DAY_MS,
	);
	await file(join(dir, "handoff-2026-09-01T00-00-00.md"), 9 * DAY_MS);
	const dead = await folder(join(temp, "-work", DEAD), 10 * DAY_MS);

	await sweep({ ...roots, handoffDays: 7, sessionDays: 20 });

	expect(await exists(handoff)).toBe(false);
	expect(await exists(dead)).toBe(true);
});
