import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { type SweepRoots, sweep } from "../sweep.ts";
import { exists, file, scratch } from "./helpers.ts";

const DAY_MS = 86_400_000;
const OLD = "handoff-2026-08-01T00-00-00.md";

let home = "";
let roots: SweepRoots;

beforeEach(async () => {
	({ home, roots } = await scratch("current", "live"));
	await mkdir(roots.home, { recursive: true });
});

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

const held = async (project: string): Promise<string> => {
	const dir = join(project, ".claude/claudetto/handoffs");
	await mkdir(dir, { recursive: true });
	await file(join(dir, "handoff-2026-09-01T00-00-00.md"), 59 * DAY_MS);
	return file(join(dir, OLD), 90 * DAY_MS);
};

test("a project root that is the home folder removes nothing and is reported", async () => {
	const old = await held(roots.home);

	const report = await sweep({ ...roots, project: roots.home });

	expect(await exists(old)).toBe(true);
	expect(report.removed).toEqual([]);
	expect(report.refused.map((entry) => entry.root)).toEqual([roots.home]);
});

const sweepUnder = async (
	part: string,
): Promise<{ kept: boolean; refused: number }> => {
	const project = join(roots.home, ".claude", part);
	const old = await held(project);

	const report = await sweep({ ...roots, project });

	return { kept: await exists(old), refused: report.refused.length };
};

test("a root inside `~/.claude/projects` is refused", async () => {
	expect(await sweepUnder("projects/p")).toEqual({ kept: true, refused: 1 });
});

test("a root inside `~/.claude/plugins` is refused", async () => {
	expect(await sweepUnder("plugins")).toEqual({ kept: true, refused: 1 });
});

test("a root that reaches the home folder through a symlink is refused", async () => {
	const old = await held(roots.home);
	const link = join(home, "alias");
	await symlink(roots.home, link);

	const report = await sweep({ ...roots, project: link });

	expect(await exists(old)).toBe(true);
	expect(report.refused).toHaveLength(1);
});

test("a project folder inside the home folder is swept", async () => {
	const project = join(roots.home, "work");
	const old = await held(project);

	const report = await sweep({ ...roots, project });

	expect(await exists(old)).toBe(false);
	expect(report.refused).toEqual([]);
});
