// The `.gitignore` step of `claudetto-setup --apply`: it lists the local files that claudetto writes into a project with `.git/`.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write } from "bun";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";

/** Calls `f` `times` times one after the other, because each call reads what the call before wrote, and gives the results. */
const repeat = async <T>(times: number, f: () => Promise<T>): Promise<T[]> =>
	times <= 0 ? [] : [await f(), ...(await repeat(times - 1, f))];

/** Runs `claudetto-setup --apply` in a new project, with `.git/` when `git` is true and `ignore` as the old `.gitignore`. */
const run = async (git: boolean, ignore?: string, times = 1) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "gitignore-"));
	const project = path.join(dir, "project");
	await mkdir(project);
	if (git) {
		await mkdir(path.join(project, ".git"));
	}
	const file = path.join(project, ".gitignore");
	if (ignore !== undefined) {
		await write(file, ignore);
	}
	const io = { log: () => undefined, error: () => undefined };
	const env = { CLAUDE_CONFIG_DIR: dir, CLAUDE_PROJECT_DIR: project };
	const codes = await repeat(times, () => main(["--apply"], env, project, io));
	if (codes.some((code) => code !== 0)) {
		throw new Error(`setup exited with ${codes.join(", ")}`);
	}
	return (await bunFile(file).exists()) ? await bunFile(file).text() : null;
};

test("in a project with `.git/`, setup lists the state, cache, and scratch files of claudetto", async () => {
	const text = (await run(true)) ?? "";
	const lines = text.split("\n");
	expect(lines).toContain("/.claude/claudetto/");
	expect(lines).toContain("/.jscpd.json");
	expect(lines).toContain("/.claude/settings.local.json");
});

test("setup keeps the files that a team shares and the files of other plugins out of the list", async () => {
	const text = (await run(true)) ?? "";
	for (const kept of ["jscpd.local.json", "openspec", "HANDOVER.md"]) {
		expect(text).not.toContain(kept);
	}
	expect(text.split("\n")).not.toContain("/.claude/");
	expect(text.split("\n")).not.toContain("/.claude/settings.json");
});

test("setup keeps the lines and the order of the user, and a second run adds no duplicate", async () => {
	const old = "dist/\n/.claude/claudetto/\nnode_modules/";
	const once = (await run(true, old)) ?? "";
	expect(once.startsWith(`${old}\n`)).toBe(true);
	expect(once.match(/^\/\.claude\/claudetto\/$/gm)).toHaveLength(1);
	expect(await run(true, old, 2)).toBe(once);
});

test("Parent Folder Ignored: with `.claude/` in `.gitignore`, setup adds no line for a file under it", async () => {
	const text = (await run(true, ".claude/\n")) ?? "";
	expect(text.split("\n")).not.toContain("/.claude/claudetto/");
	expect(text.split("\n")).not.toContain("/.claude/settings.local.json");
	expect(text.split("\n")).toContain("/.jscpd.json");
});

test("Un-ignored On Purpose: a `!` line for the folder keeps the entry out, also after `.claude/*`", async () => {
	const texts = await Promise.all(
		[".claude/*\n!.claude/claudetto/\n", "!.claude/claudetto/\n"].map(
			async (old) => (await run(true, old)) ?? "",
		),
	);
	for (const text of texts) {
		expect(text.split("\n")).not.toContain("/.claude/claudetto/");
		expect(text.split("\n")).toContain("/.jscpd.json");
	}
});

test("Un-ignored On Purpose: `!/.claude/settings.local.json` keeps that entry out", async () => {
	const text = (await run(true, "!/.claude/settings.local.json\n")) ?? "";
	expect(text.split("\n")).not.toContain("/.claude/settings.local.json");
	expect(text.split("\n")).toContain("/.claude/claudetto/");
});

test("Old Entry Only: setup adds `/.claude/claudetto/` and keeps `/.claudetto/`", async () => {
	const text = (await run(true, "/.claudetto/\n")) ?? "";
	const lines = text.split("\n");
	expect(lines).toContain("/.claudetto/");
	expect(lines).toContain("/.claude/claudetto/");
});

test("in a project with no `.git/`, setup writes no `.gitignore` and keeps an old one as it is", async () => {
	expect(await run(false)).toBeNull();
	expect(await run(false, "dist/\n")).toBe("dist/\n");
});
