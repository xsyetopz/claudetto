import { expect, test } from "bun:test";
import {
	exists,
	lutimes,
	mkdir,
	symlink,
	utimes,
	writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { spawn } from "bun";

import { parseArgs } from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/args.ts";
import { sweep } from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/sweep.ts";
import {
	outputOr,
	PROJECT_TRASH,
} from "../../plugins/claudetto/hooks/classic.SessionStart/useHygieneSweep/trash.ts";
import {
	DAY,
	git,
	host,
	NOW,
	repo,
	swept,
	sweptWhileOpen,
} from "./trash.mock.ts";

/** A folder of `bytes` zero bytes, every entry `days` old. */
const built = async (path: string, days: number, bytes = 4096) => {
	await mkdir(join(path, "debug"), { recursive: true });
	await writeFile(join(path, "debug/a"), new Uint8Array(bytes));
	const at = new Date(NOW - days * DAY);
	await Promise.all(
		[join(path, "debug/a"), join(path, "debug"), path].map((p) =>
			utimes(p, at, at),
		),
	);
};

/** Ages the worktree's git index, so its checkout reads as unused. */
const idle = async (proj: string) => {
	const at = new Date(NOW - 10 * DAY);
	await utimes(join(proj, ".git/worktrees/w/index"), at, at);
};

test("an old build folder in an idle worktree goes, and the session's own checkout keeps its", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await built(join(proj, ".build"), 10);
	await idle(proj);
	await utimes(
		join(proj, ".git/index"),
		new Date(NOW - 10 * DAY),
		new Date(NOW - 10 * DAY),
	);

	expect(await swept(root, proj)).toEqual([
		["swiftpm", join(worktree, ".build")],
	]);
});

test("a build folder linked into a worktree from elsewhere stays, and so does what it points at", async () => {
	const { root, proj, worktree } = await repo();
	const shared = join(root, "shared/.build");
	await built(shared, 10);
	await symlink(shared, join(worktree, ".build"));
	await lutimes(
		join(worktree, ".build"),
		new Date(NOW - 10 * DAY),
		new Date(NOW - 10 * DAY),
	);
	// SwiftPM's own .gitignore writes `/.build`, which also matches a link; `.build/` would not.
	await writeFile(join(proj, ".git/info/exclude"), "/.build\n");
	await idle(proj);

	expect(await swept(root, proj)).toEqual([]);
	expect(await exists(join(shared, "debug/a"))).toBe(true);
});

test("an old Nix result link into the store goes, and a result link elsewhere and a result folder stay", async () => {
	const { root, proj, worktree } = await repo();
	const old = new Date(NOW - 10 * DAY);
	// The store path need not exist: the walk never follows the link.
	await symlink("/nix/store/0000-hello-dev", join(worktree, "result-dev"));
	await symlink(join(root, "shared"), join(worktree, "result"));
	await built(join(worktree, "app/result"), 10);
	await Promise.all(
		["result-dev", "result"].map((name) =>
			lutimes(join(worktree, name), old, old),
		),
	);
	await writeFile(join(proj, ".git/info/exclude"), "result*\n");
	await idle(proj);

	expect(await swept(root, proj)).toEqual([
		["nix-result", join(worktree, "result-dev")],
	]);
});

test("a worktree whose git index changed within the limit keeps its old folders", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 30);

	expect(await swept(root, proj)).toEqual([]);
});

test("a folder that changed inside within the limit stays though its own time is old", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await writeFile(join(worktree, ".build/debug/new"), "x");
	await utimes(
		join(worktree, ".build"),
		new Date(NOW - 10 * DAY),
		new Date(NOW - 10 * DAY),
	);
	await idle(proj);

	expect(await swept(root, proj)).toEqual([]);
});

test("a tracked dist folder stays", async () => {
	const { root, proj, worktree } = await repo();
	await Promise.all(
		["dist/app.js", "dist"].map((p) =>
			utimes(
				join(worktree, p),
				new Date(NOW - 90 * DAY),
				new Date(NOW - 90 * DAY),
			),
		),
	);
	await idle(proj);

	expect(await swept(root, proj)).toEqual([]);
});

test("an unignored node_modules and an ignored build folder holding a tracked file stay", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, "node_modules"), 10);
	await built(join(worktree, ".build"), 10);
	await git(worktree, "add", "-f", ".build/debug/a");
	await git(worktree, "commit", "-qm", "f");
	await idle(proj);

	expect(await swept(root, proj)).toEqual([]);
});

test("a build folder stays while a process runs in its checkout", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await idle(proj);
	const build = spawn(["sleep", "30"], { cwd: worktree });

	const found = await swept(root, proj);
	build.kill();

	expect(found).toEqual([]);
});

test("a folder stays while a process outside the checkout holds a file in it open", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await idle(proj);

	expect(
		await sweptWhileOpen(root, proj, join(worktree, ".build/debug/a")),
	).toEqual([]);
});

test("--trash-days 0 turns project trash off and a size counts the folder's files", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10, 1_048_576);
	await idle(proj);

	expect(await swept(root, proj, ["--trash-days", "0"])).toEqual([]);
	const report = await sweep(parseArgs(["--dry-run"]), host(root, proj));
	expect(report.removed[0]?.bytes).toBeGreaterThanOrEqual(1_048_576);
});

test("an allowlist path keeps a folder a rule names", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await idle(proj);
	await writeFile(
		join(proj, PROJECT_TRASH),
		`[extend]\nuseDefault = true\n\n[[allowlists]]\npaths = ['''worktrees/w/''']\n`,
	);

	expect(await swept(root, proj)).toEqual([]);
});

test("the sweep's own process in the project does not keep its build folders", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10);
	await idle(proj);
	const back = process.cwd();
	process.chdir(worktree);

	const found = await swept(root, proj).finally(() => {
		process.chdir(back);
	});

	expect(found).toEqual([["swiftpm", join(worktree, ".build")]]);
});

// Seen in a dry run: `git ls-remote` of a remote that waited for credentials held the branch report of every later project.
test("a call that runs past its limit is stopped and logged, and answers nothing", async () => {
	const lines: string[] = [];
	const started = Date.now();

	const answer = await outputOr((line) => lines.push(line), 200)(
		["sleep", "5"],
		"/",
	);

	expect(answer).toBeUndefined();
	expect(Date.now() - started).toBeLessThan(2000);
	expect(lines).toEqual([
		"The sleep call in / failed (Error: it ran past 200 ms and was stopped)",
	]);
});
