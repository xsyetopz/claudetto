// The cleanup at session start (spec `session-hygiene`, "Cleanup at Start", "Worktrees Keep Work", "Leaked Probe Folders", and "Unknown Makers Stay").
// The test builds a fake tree under a new temp folder: a fake temp folder, a fake `~/.claude/sessions/`, and a real `git` repository with worktrees.
// It runs the real `sh` and `git` of the argv on that tree only, and it never touches the real temp folder or a real worktree.

import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, write } from "bun";
import {
	cleanupArgv,
	parseCleanup,
} from "../../../../plugins/claudetto/modules/session/hygiene/domain/cleanup.ts";
import { sweepArgv } from "../../../../plugins/claudetto/modules/session/hygiene/domain/probes.ts";
import { eachInOrder } from "../../../../tools/ordered.ts";
import { outputOf } from "../../../support/io.ts";

const base = await mkdtemp(path.join(tmpdir(), "hygiene-cleanup-"));
afterAll(() => rm(base, { recursive: true, force: true }));

const DAY = 86_400_000;
const uid = process.getuid?.() ?? 0;
const temp = path.join(base, "tmp");
const root = path.join(temp, `claude-${uid}`);
const sessions = path.join(base, "home", ".claude", "sessions");
const project = path.join(base, "project");
const worktrees = path.join(project, ".claude", "worktrees");

const ID = {
	live: "11111111-1111-4111-8111-111111111111",
	ended: "22222222-2222-4222-8222-222222222222",
	young: "33333333-3333-4333-8333-333333333333",
	current: "44444444-4444-4444-8444-444444444444",
	file: "55555555-5555-4555-8555-555555555555",
};

/** Whether a folder or a file exists at `target`. */
const exists = async (target: string): Promise<boolean> => {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
};

/** Sets the age of a folder or a file to `days` days. */
const age = (target: string, days: number): Promise<void> => {
	const t = (Date.now() - days * DAY) / 1000;
	return utimes(target, t, t);
};

const env = {
	...process.env,
	GIT_CONFIG_GLOBAL: "/dev/null",
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_AUTHOR_NAME: "t",
	GIT_AUTHOR_EMAIL: "t@example.com",
	GIT_COMMITTER_NAME: "t",
	GIT_COMMITTER_EMAIL: "t@example.com",
};

interface Run {
	exitCode: number;
	stdout: string;
	stderr: string;
}

/** Runs `argv` in `cwd` with the fixed `env`, and waits for its exit and its output. */
const run = async (argv: string[], cwd?: string): Promise<Run> => {
	const proc = spawn(argv, {
		...(cwd === undefined ? {} : { cwd }),
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	return outputOf(proc);
};

const git = async (cwd: string, ...args: string[]): Promise<string> => {
	const done = await run(["git", ...args], cwd);
	if (done.exitCode !== 0) {
		throw new Error(done.stderr);
	}
	return done.stdout;
};

const session = async (
	folder: string,
	id: string,
	bytes = 100,
): Promise<string> => {
	const dir = path.join(root, folder, id);
	await mkdir(dir, { recursive: true });
	await write(path.join(dir, "scratch"), "x".repeat(bytes));
	return dir;
};

let result: ReturnType<typeof parseCleanup>;
let probe: Run;

beforeAll(async () => {
	// Session folders.
	await age(await session("-proj", ID.live), 40);
	await age(await session("-proj", ID.ended, 5000), 31);
	await age(await session("-proj", ID.young), 1);
	await age(await session("-proj", ID.current), 40);
	await mkdir(sessions, { recursive: true });
	await write(
		path.join(sessions, "100.json"),
		JSON.stringify({ pid: 100, sessionId: ID.live, cwd: project }),
	);
	// A claudetto file of an ended session, and one of a live session.
	await mkdir(path.join(temp, "claudetto", "goal"), { recursive: true });
	const gone = path.join(temp, "claudetto", "goal", `${ID.file}.log`);
	const kept = path.join(temp, "claudetto", "goal", `${ID.live}.log`);
	await write(gone, "x");
	await write(kept, "x");
	await age(gone, 40);
	await age(kept, 40);
	// Probe folders and an unknown folder.
	await Promise.all(
		(
			[
				["fswatch-probe-old", 2 / 24],
				["fswatch-probe-new", 0],
				["tscheck", 40],
			] as const
		).map(async ([name, days]) => {
			await mkdir(path.join(root, name, "x"), { recursive: true });
			await age(path.join(root, name), days);
		}),
	);
	await write(path.join(root, "cache-break-state.json"), "{}");
	// A repository with one worktree for each case.
	await mkdir(project, { recursive: true });
	await git(project, "init", "-q", "-b", "main");
	await write(path.join(project, "a.txt"), "a\n");
	await git(project, "add", ".");
	await git(project, "commit", "-q", "-m", "first");
	// Each `git worktree add` writes the shared `.git/worktrees` folder, so they run one after the other.
	await eachInOrder(
		["merged", "unmerged", "dirty", "ignored", "rebuilt", "live", "young"],
		async (name) => {
			await git(
				project,
				"worktree",
				"add",
				"-q",
				"-b",
				name,
				path.join(worktrees, name),
			);
		},
	);
	await write(path.join(worktrees, "unmerged", "b.txt"), "b\n");
	await git(path.join(worktrees, "unmerged"), "add", ".");
	await git(
		path.join(worktrees, "unmerged"),
		"commit",
		"-q",
		"-m",
		"only here",
	);
	await write(path.join(worktrees, "dirty", "c.txt"), "c\n");
	await write(
		path.join(project, ".git", "info", "exclude"),
		".env\nnode_modules/\ndist/\n",
	);
	await write(path.join(worktrees, "ignored", ".env"), "KEY=1\n");
	// Folders that a tool makes again, such as `node_modules`, keep no work.
	await Promise.all(
		["ignored", "rebuilt"].map((name) =>
			write(path.join(worktrees, name, "node_modules", "p", "index.js"), "x\n"),
		),
	);
	await write(path.join(worktrees, "rebuilt", "app", "dist", "x.js"), "x\n");
	await write(
		path.join(sessions, "200.json"),
		JSON.stringify({
			pid: 200,
			sessionId: "x",
			cwd: path.join(worktrees, "live", "sub"),
		}),
	);
	await Promise.all(
		["merged", "unmerged", "dirty", "ignored", "rebuilt", "live"].map((name) =>
			age(path.join(worktrees, name), 40),
		),
	);

	const cleaned = await run(
		cleanupArgv({
			tmp: temp,
			sessions,
			worktrees,
			days: 30,
			current: ID.current,
		}),
	);
	if (cleaned.exitCode !== 0) {
		throw new Error(
			`the cleanup exited ${cleaned.exitCode}: ${cleaned.stderr}`,
		);
	}
	result = parseCleanup(cleaned.stdout);
	probe = await run(sweepArgv(temp));
});

test("Live Session: a folder that a session file names stays, whatever its age", async () => {
	expect(await exists(path.join(root, "-proj", ID.live))).toBe(true);
	expect(
		await exists(path.join(temp, "claudetto", "goal", `${ID.live}.log`)),
	).toBe(true);
});

test("Live Session: the folder of the current session and a young folder stay", async () => {
	expect(await exists(path.join(root, "-proj", ID.current))).toBe(true);
	expect(await exists(path.join(root, "-proj", ID.young))).toBe(true);
});

test("Ended Session: a folder of 31 days with no session file goes, and the report counts it and its bytes", async () => {
	expect(await exists(path.join(root, "-proj", ID.ended))).toBe(false);
	expect(result.folders).toBe(1);
	expect(result.bytes).toBeGreaterThanOrEqual(5000);
	expect(
		await exists(path.join(temp, "claudetto", "goal", `${ID.file}.log`)),
	).toBe(false);
	expect(result.files).toBe(1);
});

test("Worktrees Keep Work: a clean, merged worktree of an ended session goes, also with git-ignored files only in `node_modules` or `dist`", async () => {
	expect(await exists(path.join(worktrees, "merged"))).toBe(false);
	expect(await exists(path.join(worktrees, "rebuilt"))).toBe(false);
	expect(result.worktrees).toStrictEqual([
		path.join(worktrees, "merged"),
		path.join(worktrees, "rebuilt"),
	]);
	expect(await git(project, "worktree", "list")).not.toContain(
		"worktrees/merged ",
	);
});

test("Unmerged Work: a worktree with a commit that no other branch has stays, and the report names it", async () => {
	expect(await exists(path.join(worktrees, "unmerged"))).toBe(true);
	expect(result.kept).toContainEqual({
		path: path.join(worktrees, "unmerged"),
		reason: "unmerged",
	});
});

test("a dirty worktree, a worktree with a git-ignored file, a live worktree, and a young worktree stay, and the report names each", async () => {
	const stays = [
		["dirty", "dirty"],
		["ignored", "dirty"],
		["live", "live"],
		["young", "young"],
	] as const;
	const present = await Promise.all(
		stays.map(([name]) => exists(path.join(worktrees, name))),
	);
	for (const [i, [name, reason]] of stays.entries()) {
		expect(present[i], name).toBe(true);
		expect(result.kept).toContainEqual({
			path: path.join(worktrees, name),
			reason,
		});
	}
	expect(result.kept.length).toBe(5);
});

test("Old Probe and Running Probe: only the probe folder over one hour goes", async () => {
	expect(probe.exitCode).toBe(0);
	expect(await exists(path.join(root, "fswatch-probe-old"))).toBe(false);
	expect(await exists(path.join(root, "fswatch-probe-new"))).toBe(true);
});

test("Unknown Folder: a folder and a file that no rule names stay, and the report counts them", async () => {
	expect(await exists(path.join(root, "tscheck"))).toBe(true);
	expect(await exists(path.join(root, "cache-break-state.json"))).toBe(true);
	expect(result.unknown).toBe(2);
});

test("the cleanup of a tree that does not exist removes nothing and reports nothing", async () => {
	const done = await run(
		cleanupArgv({
			tmp: path.join(base, "none"),
			sessions: path.join(base, "none"),
			worktrees: path.join(base, "none"),
			days: 30,
			current: ID.current,
		}),
	);
	expect(parseCleanup(done.stdout)).toStrictEqual({
		folders: 0,
		bytes: 0,
		files: 0,
		worktrees: [],
		kept: [],
		unknown: 0,
	});
});
