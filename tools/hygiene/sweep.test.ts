import { expect, test } from "bun:test";
import { mkdir, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseArgs } from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/args.ts";
import { sweep } from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/sweep.ts";
import { tempDir } from "../temp.mock.ts";
import { DAY, host as hostOf, NOW, UID } from "./trash.mock.ts";

type Host = Parameters<typeof sweep>[1];

const project = async () => {
	const root = await tempDir("hygiene-");
	await mkdir(join(root, "home"), { recursive: true });
	await mkdir(join(root, "proj/.claude/claudetto/heartbeat"), {
		recursive: true,
	});
	return root;
};

const host = (root: string, over: Partial<Host> = {}): Host => ({
	...hostOf(root, join(root, "proj")),
	...over,
});

const aged = async (path: string, days: number, body = "x") => {
	await writeFile(path, body);
	const at = new Date(NOW - days * DAY);
	await utimes(path, at, at);
};

const kinds = async (root: string, args = parseArgs([]), over = {}) => {
	const report = await sweep(args, host(root, over));
	return report.removed.map((item) => item.kind);
};

test("a heartbeat file older than a day goes and a newer one stays", async () => {
	const root = await project();
	const dir = join(root, "proj/.claude/claudetto/heartbeat");
	await aged(join(dir, "old.txt"), 3);
	await aged(join(dir, "new.txt"), 0);

	const report = await sweep(parseArgs([]), host(root));

	expect(report.removed.map((item) => item.path)).toEqual([
		join(dir, "old.txt"),
	]);
});

test("a dry run lists the files and removes none", async () => {
	const root = await project();
	const dir = join(root, "proj/.claude/claudetto/heartbeat");
	await aged(join(dir, "a.txt"), 3);
	await aged(join(dir, "b.txt"), 3);

	const first = await sweep(parseArgs(["--dry-run"]), host(root));
	const second = await sweep(parseArgs(["--dry-run"]), host(root));

	expect(first.removed).toHaveLength(2);
	expect(second.removed).toHaveLength(2);
});

test("a kind with 0 is off and the other kinds are still swept", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID}`);
	await mkdir(join(tmp, "fswatch-probe-a"), { recursive: true });
	await utimes(
		join(tmp, "fswatch-probe-a"),
		new Date(NOW - DAY),
		new Date(NOW - DAY),
	);
	const dir = join(root, "proj/.claude/claudetto/heartbeat");
	await aged(join(dir, "a.txt"), 3);
	await aged(join(dir, "b.txt"), 3);

	const found = await kinds(root, parseArgs(["--probe-minutes", "0"]));

	expect(found).toEqual(["heartbeat", "heartbeat"]);
});

test("an unset probe limit is 60 minutes", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID}`);
	await mkdir(join(tmp, "fswatch-probe-a"), { recursive: true });
	await mkdir(join(tmp, "fswatch-probe-b"), { recursive: true });
	const old = new Date(NOW - 2 * 3_600_000);
	await utimes(join(tmp, "fswatch-probe-a"), old, old);

	const report = await sweep(parseArgs([]), host(root));

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "fswatch-probe-a"),
	]);
});

test("a session folder named by a live session stays and an old one goes", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID}`, "-Users-me-proj");
	await mkdir(join(tmp, "live-1"), { recursive: true });
	await mkdir(join(tmp, "dead-2"), { recursive: true });
	const old = new Date(NOW - 90 * DAY);
	await utimes(join(tmp, "live-1"), old, old);
	await utimes(join(tmp, "dead-2"), old, old);

	const report = await sweep(parseArgs(["--session", "live-1"]), host(root));

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "dead-2"),
	]);
});

test("two candidates for one folder sweep it once", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID}`);
	await mkdir(join(tmp, "fswatch-probe-a"), { recursive: true });
	const old = new Date(NOW - 2 * 3_600_000);
	await utimes(join(tmp, "fswatch-probe-a"), old, old);

	const found = await kinds(root, parseArgs([]), {
		tempBases: [join(root, "tmp"), join(root, "tmp")],
	});

	expect(found).toEqual(["probe"]);
});

test("a temp folder of another user is not swept", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID + 1}`);
	await mkdir(join(tmp, "fswatch-probe-a"), { recursive: true });

	const found = await kinds(root, parseArgs([]), {
		uid: UID + 1,
	});

	expect(found).toEqual([]);
});

test("the home folder as project removes nothing and reports the refusal", async () => {
	const root = await project();
	const dir = join(root, "home/.claude/claudetto/heartbeat");
	await mkdir(dir, { recursive: true });
	await aged(join(dir, "a.txt"), 3);
	await aged(join(dir, "b.txt"), 3);

	const report = await sweep(
		parseArgs([]),
		host(root, { cwd: join(root, "home") }),
	);

	expect(report.removed).toEqual([]);
	expect(report.refused[0]).toContain("is the home folder");
});

test("a project inside ~/.claude/projects is refused", async () => {
	const root = await project();
	const inside = join(root, "home/.claude/projects/p");
	await mkdir(inside, { recursive: true });

	const report = await sweep(parseArgs([]), host(root, { cwd: inside }));

	expect(report.refused[0]).toContain("~/.claude/projects");
});
