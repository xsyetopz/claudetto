import { expect, test } from "bun:test";
import { chmod, mkdir, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseArgs } from "../../plugins/claudetto/hygiene/args.ts";
import { sweep } from "../../plugins/claudetto/hygiene/sweep.ts";
import { tempDir } from "../temp.mock.ts";
import { DAY, host as hostOf, logged, NOW, UID } from "./trash.mock.ts";

type Host = Parameters<typeof sweep>[1];

const START = "Fri Nov 13 00:49:05 2026";

const project = async () => {
	const root = await tempDir("hygiene-");
	await mkdir(join(root, "home/.claude/sessions"), { recursive: true });
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

const projectTemp = (root: string) =>
	join(root, "tmp", `claude-${UID}`, "-Users-me-proj");

/** Session folders that Claude Code made long ago, one for each name. */
const sessionFolders = async (root: string, ...names: string[]) => {
	const tmp = projectTemp(root);
	const old = new Date(NOW - 90 * DAY);
	await Promise.all(
		names.map(async (name) => {
			await mkdir(join(tmp, name), { recursive: true });
			await utimes(join(tmp, name), old, old);
		}),
	);
	return tmp;
};

const record = (root: string, pid: number, body: unknown) =>
	writeFile(
		join(root, "home/.claude/sessions", `${pid}.json`),
		typeof body === "string" ? body : JSON.stringify(body),
	);

const running =
	(pids: Record<number, string>): Host["procStart"] =>
	(pid) =>
		Promise.resolve(pids[pid]);

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

test("a session folder of a running session stays and a folder no record names goes", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "live-1", "dead-2");
	await record(root, 4001, {
		pid: 4001,
		sessionId: "live-1",
		procStart: START,
	});

	const report = await sweep(
		parseArgs([]),
		host(root, { procStart: running({ 4001: START }) }),
	);

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "dead-2"),
	]);
});

test("a record whose pid no longer runs frees its session folder", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "gone-1");
	await record(root, 4002, {
		pid: 4002,
		sessionId: "gone-1",
		procStart: START,
	});

	const report = await sweep(parseArgs([]), host(root));

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "gone-1"),
	]);
});

test("a pid that another process took over, with a different start, frees the folder", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "reused-1");
	await record(root, 4003, {
		pid: 4003,
		sessionId: "reused-1",
		procStart: START,
	});

	const report = await sweep(
		parseArgs([]),
		host(root, {
			procStart: running({ 4003: "Sat Nov 14 10:00:00 2026" }),
		}),
	);

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "reused-1"),
	]);
});

test("a process start that differs only in spacing still names a running session", async () => {
	const root = await project();
	await sessionFolders(root, "live-1");
	await record(root, 4004, {
		pid: 4004,
		sessionId: "live-1",
		procStart: "Fri Nov  3 00:49:05 2026",
	});

	const found = await kinds(root, parseArgs([]), {
		procStart: running({ 4004: "Fri Nov 3 00:49:05 2026" }),
	});

	expect(found).toEqual([]);
});

test("a record that is not readable removes no session folder and is logged", async () => {
	const root = await project();
	await sessionFolders(root, "dead-2");
	await record(root, 4005, "{ not json");
	logged.length = 0;

	const report = await sweep(parseArgs([]), host(root));

	expect(report.removed).toEqual([]);
	expect(logged.some((line) => line.includes("4005.json"))).toBe(true);
});

test("a record with no process start removes no session folder", async () => {
	const root = await project();
	await sessionFolders(root, "dead-2");
	await record(root, 4006, { pid: 4006, sessionId: "dead-2" });

	expect(await kinds(root)).toEqual([]);
});

test("the session named by --session stays with no record", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "mine-1", "dead-2");

	const report = await sweep(parseArgs(["--session", "mine-1"]), host(root));

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "dead-2"),
	]);
});

test("a young session folder with no record stays", async () => {
	const root = await project();
	await mkdir(join(projectTemp(root), "fresh-1"), { recursive: true });

	expect(await kinds(root)).toEqual([]);
});

test("an idle entry that is no session folder stays whatever its age", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID}`);
	await mkdir(join(tmp, "fswatch-probe-a"), { recursive: true });
	await mkdir(join(tmp, "scratch"), { recursive: true });
	const old = new Date(NOW - 90 * DAY);
	await utimes(join(tmp, "fswatch-probe-a"), old, old);
	await utimes(join(tmp, "scratch"), old, old);

	expect(await kinds(root)).toEqual([]);
});

test("a session folder that cannot be removed is logged and left out of the report, and the others go", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "stuck-1", "dead-2");
	await writeFile(join(tmp, "stuck-1", "a"), "x");
	const old = new Date(NOW - 90 * DAY);
	await utimes(join(tmp, "stuck-1"), old, old);
	await chmod(join(tmp, "stuck-1"), 0o555);
	logged.length = 0;

	const report = await sweep(parseArgs([]), host(root));
	await chmod(join(tmp, "stuck-1"), 0o755);

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "dead-2"),
	]);
	expect(logged.join("\n")).toContain(
		`${join(tmp, "stuck-1")} was not removed`,
	);
});

test("two bases that resolve to one folder sweep it once", async () => {
	const root = await project();
	const tmp = await sessionFolders(root, "dead-2");

	const report = await sweep(
		parseArgs([]),
		host(root, { tempBases: [join(root, "tmp"), join(root, "tmp")] }),
	);

	expect(report.removed.map((item) => item.path)).toEqual([
		join(tmp, "dead-2"),
	]);
});

test("a temp folder of another user is not swept", async () => {
	const root = await project();
	const tmp = join(root, "tmp", `claude-${UID + 1}`, "-Users-me-proj");
	await mkdir(join(tmp, "dead-2"), { recursive: true });
	const old = new Date(NOW - 90 * DAY);
	await utimes(join(tmp, "dead-2"), old, old);

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
