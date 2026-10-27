// The git cache of the `statusline` slice: a `git status` result stays for `GIT_CACHE_MS`, in a file of the temp folder.
// The clock, the files, and the `git` runner are fakes, so that no file is written and no `git` runs.

import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { cacheFile } from "../../../../plugins/claudetto/modules/statusline/adapters/git-cache.ts";
import {
	GIT_CACHE_MS,
	REFRESH_SECONDS,
} from "../../../../plugins/claudetto/modules/statusline/limits.ts";
import {
	depsFor,
	GIT_TEXT,
	memoryFiles,
	NOW,
	type Run,
	STATUS,
} from "../support.ts";

test("a run inside `GIT_CACHE_MS` runs no `git`, and a run after it runs `git` again", async () => {
	const memory = memoryFiles();
	let clock = NOW;
	let gitRuns = 0;
	const runner = {
		run: async () => {
			gitRuns++;
			return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
		},
	};
	const runAt = async (at: number): Promise<Run> => {
		clock = at;
		const run: Run = { status: -1, out: [], err: [] };
		run.status = await main(
			[],
			depsFor(STATUS, run, {
				env: { COLUMNS: "124", NO_COLOR: "1" },
				now: () => clock,
				files: memory.reader,
				write: memory.write,
				runner,
			}),
		);
		return run;
	};

	await runAt(NOW);
	expect(gitRuns).toBe(1);

	const refresh = await runAt(NOW + REFRESH_SECONDS * 1000);
	expect(gitRuns).toBe(1);
	expect(refresh.out[0]).toContain("main");

	await runAt(NOW + GIT_CACHE_MS);
	expect(gitRuns).toBe(2);
});

test("the cache of a repository is not used by another repository", async () => {
	const memory = memoryFiles();
	let gitRuns = 0;
	const runner = {
		run: async () => {
			gitRuns++;
			return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
		},
	};
	const other = {
		...STATUS,
		workspace: { current_dir: "/work/other", project_dir: "/work/other" },
	};
	const runFor = async (input: typeof STATUS) => {
		const run: Run = { status: -1, out: [], err: [] };
		await main(
			[],
			depsFor(input, run, {
				env: { COLUMNS: "124", NO_COLOR: "1" },
				files: memory.reader,
				write: memory.write,
				runner,
			}),
		);
	};
	await runFor(STATUS);
	await runFor(other);
	expect(gitRuns).toBe(2);
});

test("the cache file is in the temp folder and does not name the repository path", async () => {
	const memory = memoryFiles();
	const run: Run = { status: -1, out: [], err: [] };
	await main(
		[],
		depsFor(STATUS, run, {
			env: { COLUMNS: "124", NO_COLOR: "1" },
			files: memory.reader,
			write: memory.write,
		}),
	);
	const cached = [...memory.files.keys()].filter((file) =>
		path.basename(file).startsWith("claudetto-git-"),
	);
	expect(cached.length).toBe(1);
	expect(cached[0]?.startsWith(os.tmpdir())).toBe(true);
	expect(cached[0]).not.toContain("/work/claudetto");
	// A JSONL file: one record on one line, with a line end.
	expect(cached[0]?.endsWith(".jsonl")).toBe(true);
	const text = memory.files.get(cached[0] ?? "") ?? "";
	expect(text.endsWith("\n")).toBe(true);
	expect(text.trimEnd()).not.toContain("\n");
});

/** Runs the status line once with a saved cache `text` for the repository of `STATUS`, and counts the `git` runs. */
const runWithSaved = async (
	text: string,
): Promise<{ gitRuns: number; out: string }> => {
	const memory = memoryFiles();
	const file = await cacheFile(STATUS.workspace.current_dir);
	if (file === undefined) {
		throw new Error("the test needs a cache folder");
	}
	memory.files.set(file, text);
	let gitRuns = 0;
	const runner = {
		run: async () => {
			gitRuns++;
			return { exitCode: 0, stdout: GIT_TEXT, stderr: "" };
		},
	};
	const run: Run = { status: -1, out: [], err: [] };
	await main(
		[],
		depsFor(STATUS, run, {
			env: { COLUMNS: "124", NO_COLOR: "1" },
			now: () => NOW,
			files: memory.reader,
			write: memory.write,
			runner,
		}),
	);
	return { gitRuns, out: run.out.join("\n") };
};

test("a cache file with a wrong field type is no cache, and `git` runs", async () => {
	const saved = JSON.stringify({
		at: NOW,
		state: { branch: 7, dirty: 0, ahead: 0, behind: 0 },
	});
	const { gitRuns } = await runWithSaved(saved);
	expect(gitRuns).toBe(1);
});

test("a torn, empty, or non-object cache file is no cache, and the status line still shows", async () => {
	const runs = await Promise.all(
		["", '{"at":', "null", "5", "[]"].map((damaged) => runWithSaved(damaged)),
	);
	for (const { gitRuns, out } of runs) {
		expect(gitRuns).toBe(1);
		expect(out).toContain("⌂ claudetto");
	}
});

test("a cache folder with group or other mode bits is no cache folder", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "git-cache-"));
	const folder = path.join(root, `claudetto-git-${os.userInfo().uid}`);
	await mkdir(folder);
	await chmod(folder, 0o755);
	expect(await cacheFile(STATUS.workspace.current_dir, root)).toBeUndefined();
});

test("a missing cache folder is made with mode `0700` and used", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "git-cache-"));
	const file = await cacheFile(STATUS.workspace.current_dir, root);
	const folder = path.dirname(file ?? "");
	expect(path.dirname(folder)).toBe(root);
	expect((await stat(folder)).mode & 0o777).toBe(0o700);
});
