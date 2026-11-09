import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	type Files,
	NODE_FILES,
	readLocal,
} from "../../plugins/claudetto/statusline/local.ts";
import { statusWithFiles } from "../../plugins/claudetto/statusline/main.ts";
import { plain } from "../../plugins/claudetto/statusline/width.ts";
import { NOW } from "./support.ts";

const ROOT = await mkdtemp(join(tmpdir(), "claudetto-local-"));
afterAll(() => rm(ROOT, { recursive: true, force: true }));

const put = async (path: string, text: string): Promise<void> => {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, text);
};

/** The first row for a session with only these fields, so the place items are all it holds, read through the real file reader. */
const firstRow = async (fields: Record<string, unknown>): Promise<string> =>
	plain(
		await statusWithFiles(
			JSON.stringify(fields),
			{ COLUMNS: "200", NO_COLOR: "1" },
			NOW,
		),
	).split("\n")[0] ?? "";

const placeRow = (
	dir: string,
	fields: Record<string, unknown> = {},
): Promise<string> => firstRow({ workspace: { current_dir: dir }, ...fields });

describe("the branch of a session without a `worktree` field", async () => {
	test("a plain checkout on `main` shows `⎇ main`", async () => {
		const repo = join(ROOT, "plain");
		await put(join(repo, ".git/HEAD"), "ref: refs/heads/main\n");
		expect(await placeRow(repo)).toBe("⌂ plain · ⎇ main");
	});

	test("a folder below the checkout root finds the `HEAD` of its parent", async () => {
		const repo = join(ROOT, "nested");
		await put(join(repo, ".git/HEAD"), "ref: refs/heads/release/1.0\n");
		await mkdir(join(repo, "a/b"), { recursive: true });
		expect(await placeRow(join(repo, "a/b"))).toBe("⌂ b · ⎇ release/1.0");
	});

	test("a linked worktree reads the `HEAD` its `gitdir:` line names, relative or absolute", async () => {
		const main = join(ROOT, "main-repo");
		await put(
			join(main, ".git/worktrees/wt/HEAD"),
			"ref: refs/heads/feature/x\n",
		);
		const absolute = join(ROOT, "wt-abs");
		await put(
			join(absolute, ".git"),
			`gitdir: ${join(main, ".git/worktrees/wt")}\n`,
		);
		const relative = join(ROOT, "wt-rel");
		await put(
			join(relative, ".git"),
			"gitdir: ../main-repo/.git/worktrees/wt\n",
		);
		expect(await placeRow(absolute)).toBe("⌂ wt-abs · ⎇ feature/x");
		expect(await placeRow(relative)).toBe("⌂ wt-rel · ⎇ feature/x");
	});

	test("a detached `HEAD` shows its first 7 hex digits", async () => {
		const repo = join(ROOT, "detached");
		await put(
			join(repo, ".git/HEAD"),
			"544088f7c0ffee0123456789abcdef0123456789\n",
		);
		expect(await placeRow(repo)).toBe("⌂ detached · ⎇ 544088f");
	});

	test("a folder outside any repository shows no branch", async () => {
		const dir = join(ROOT, "loose");
		await mkdir(dir, { recursive: true });
		expect(await placeRow(dir)).toBe("⌂ loose");
	});

	test("`worktree.branch` on stdin wins over the file", async () => {
		const repo = join(ROOT, "both");
		await put(join(repo, ".git/HEAD"), "ref: refs/heads/main\n");
		expect(await placeRow(repo, { worktree: { branch: "wt-branch" } })).toBe(
			"⌂ both · ⎇ wt-branch",
		);
	});

	test("`workspace.project_dir` is the folder read before `current_dir`", async () => {
		const repo = join(ROOT, "project");
		await put(join(repo, ".git/HEAD"), "ref: refs/heads/dev\n");
		const elsewhere = join(ROOT, "loose-2");
		await mkdir(elsewhere, { recursive: true });
		const row = await firstRow({
			workspace: { current_dir: elsewhere, project_dir: repo },
		});
		expect(row).toBe("⌂ loose-2 · ⎇ dev");
	});
});

/** A `tasks.md` with `done` ticked and `open` unticked boxes, modified at `at` seconds. */
const change = async (
	project: string,
	name: string,
	done: number,
	open: number,
	at = 1_700_000_000,
): Promise<void> => {
	const path = join(project, "openspec/changes", name, "tasks.md");
	await put(
		path,
		[
			"# Tasks",
			...Array.from({ length: done }, (_, i) => `- [x] 1.${i} done`),
			...Array.from({ length: open }, (_, i) => `- [ ] 2.${i} open`),
		].join("\n"),
	);
	await utimes(path, at, at);
};

describe("the open OpenSpec changes of the project", async () => {
	test("one open change shows its name and its ticked and total boxes", async () => {
		const project = join(ROOT, "spec-one");
		await change(project, "release-0-3-0", 4, 8);
		expect(await placeRow(project)).toBe("⌂ spec-one · ☐ release-0-3-0 4/12");
	});

	test("a change whose boxes are all ticked, or with no `tasks.md`, is not shown", async () => {
		const project = join(ROOT, "spec-done");
		await change(project, "finished", 3, 0);
		await mkdir(join(project, "openspec/changes/no-tasks"), {
			recursive: true,
		});
		await change(project, "archive", 0, 5);
		expect(await placeRow(project)).toBe("⌂ spec-done");
	});

	test("four open changes show the two most recently modified and `+2`", async () => {
		const project = join(ROOT, "spec-many");
		await change(project, "a-old", 1, 1, 1_700_000_001);
		await change(project, "b-newest", 0, 2, 1_700_000_004);
		await change(project, "c-mid", 2, 1, 1_700_000_002);
		await change(project, "d-newer", 1, 3, 1_700_000_003);
		expect(await placeRow(project)).toBe(
			"⌂ spec-many · ☐ b-newest 0/2, d-newer 1/4 +2",
		);
	});

	test("a project with no `openspec/` folder shows no OpenSpec part", async () => {
		const dir = join(ROOT, "spec-none");
		await mkdir(dir, { recursive: true });
		expect(await placeRow(dir)).toBe("⌂ spec-none");
	});

	test("the reader touches only `HEAD`, the `.git` file, the changes folder, and each `tasks.md`", async () => {
		const project = join(ROOT, "bounded/project");
		const gitDir = join(ROOT, "bounded/store/worktrees/project");
		await put(join(project, ".git"), `gitdir: ${gitDir}\n`);
		await put(join(gitDir, "HEAD"), "ref: refs/heads/main\n");
		await put(join(project, "openspec/changes/one/tasks.md"), "- [ ] a\n");
		await put(join(project, "openspec/changes/one/design.md"), "x\n");
		await put(
			join(project, "openspec/changes/archive/old/tasks.md"),
			"- [ ] b\n",
		);
		await put(join(project, "src/main.ts"), "x\n");
		const touched: string[] = [];
		const recording: Files = {
			read: (path, cap) => {
				touched.push(path);
				return NODE_FILES.read(path, cap);
			},
			folders: (path) => {
				touched.push(path);
				return NODE_FILES.folders(path);
			},
			mtime: (path) => {
				touched.push(path);
				return NODE_FILES.mtime(path);
			},
		};
		const named = new Set([
			join(project, ".git", "HEAD"),
			join(project, ".git"),
			join(gitDir, "HEAD"),
			join(project, "openspec/changes"),
			join(project, "openspec/changes/one/tasks.md"),
		]);

		expect(await readLocal(project, recording)).toMatchObject({
			branch: "main",
			changes: [{ name: "one", done: 0, total: 1 }],
		});
		expect(touched.filter((path) => !named.has(path))).toEqual([]);
	});

	test("boxes are counted the way OpenSpec counts them", async () => {
		const project = join(ROOT, "spec-forms");
		await put(
			join(project, "openspec/changes/forms/tasks.md"),
			[
				"- [X] upper",
				"- [ x ] padded",
				"  * [x] nested",
				"1. [ ] ordered",
				"+ [~] other marker",
				"- [] empty",
				"- [A](https://example.com) link, not a task",
				"- [WIP] word, not a task",
			].join("\r\n"),
		);
		expect((await readLocal(project)).changes).toMatchObject([
			{ name: "forms", done: 3, total: 6 },
		]);
	});
});
