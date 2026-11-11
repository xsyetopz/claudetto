import { expect, test } from "bun:test";
import {
	exists,
	lutimes,
	mkdir,
	mkdtemp,
	realpath,
	symlink,
	utimes,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sleep, spawn } from "bun";

import { parseArgs } from "../../plugins/claudetto/hooks/hygiene/args.ts";
import { sweep } from "../../plugins/claudetto/hooks/hygiene/sweep.ts";
import { PROJECT_TRASH } from "../../plugins/claudetto/hooks/hygiene/trash.ts";

const DAY = 86_400_000;
const NOW = Date.now();
const UID = process.getuid?.() ?? 0;

const git = (cwd: string, ...args: string[]) =>
	spawn(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], {
		cwd,
	}).exited;

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

/** A repo that ignores `.build/` and tracks `dist/`, with one worktree under `.claude/worktrees/w`. */
const repo = async () => {
	const root = await realpath(await mkdtemp(join(tmpdir(), "trash-")));
	const proj = join(root, "proj");
	await mkdir(join(proj, "dist"), { recursive: true });
	await mkdir(join(proj, ".claude/claudetto"), { recursive: true });
	await writeFile(join(proj, ".gitignore"), ".build/\n.claude/\n");
	await writeFile(join(proj, "dist/app.js"), "x");
	await git(proj, "init", "-q");
	await git(proj, "add", ".");
	await git(proj, "commit", "-qm", "i");
	await git(proj, "worktree", "add", "-q", ".claude/worktrees/w");
	return { root, proj, worktree: join(proj, ".claude/worktrees/w") };
};

/** Marks a folder as made by the session `owner`; a folder with no owner stays unmarked. */
const mark = async (dir: string, owner: string | undefined) => {
	if (owner === undefined) {
		return;
	}
	await writeFile(join(dir, ".created-by-claudetto"), `${owner}\n`);
};

/** Ages the worktree's git index, so its checkout reads as unused. */
const idle = async (proj: string) => {
	const at = new Date(NOW - 10 * DAY);
	await utimes(join(proj, ".git/worktrees/w/index"), at, at);
};

const logged: string[] = [];
const host = (root: string, proj: string) => ({
	cwd: proj,
	home: join(root, "home"),
	now: NOW,
	uid: UID,
	days: 30,
	tempBases: [join(root, "tmp")],
	configDir: join(root, "home/.claude"),
	log: (line: string) => logged.push(line),
});

const swept = async (root: string, proj: string, argv: string[] = []) => {
	const report = await sweep(parseArgs(argv), host(root, proj));
	return report.removed.map((item) => [item.kind, item.path]);
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
	const reader = spawn(["tail", "-f", join(worktree, ".build/debug/a")], {
		cwd: root,
		stdout: "ignore",
	});
	await sleep(200);

	const found = await swept(root, proj);
	reader.kill();

	expect(found).toEqual([]);
});

test("--trash-days 0 turns project trash off and a size counts the folder's files", async () => {
	const { root, proj, worktree } = await repo();
	await built(join(worktree, ".build"), 10, 1_048_576);
	await idle(proj);

	expect(await swept(root, proj, ["--trash-days", "0"])).toEqual([]);
	const report = await sweep(parseArgs(["--dry-run"]), host(root, proj));
	expect(report.removed[0]?.bytes).toBeGreaterThanOrEqual(1_048_576);
});

test("a temp folder marked by an ended session goes, and a live one's and an unmarked one stay", async () => {
	const { root, proj } = await repo();
	const tmp = join(root, "tmp");
	await Promise.all(
		[
			["probe-ended", "s-ended"],
			["probe-live", "s-live"],
			["probe-unmarked", undefined],
		].map(async ([name = "", owner]) => {
			await mkdir(join(tmp, name), { recursive: true });
			await mark(join(tmp, name), owner);
			await utimes(join(tmp, name), new Date(NOW - DAY), new Date(NOW - DAY));
		}),
	);

	expect(await swept(root, proj, ["--session", "s-live"])).toEqual([
		["claudetto-temp", join(tmp, "probe-ended")],
	]);
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
