// Pins `dev/eval-variant.ts`: the results of the variant arm are copied out before the worktree goes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { git, kept, resultsRoot, run, setUp } from "./fixture-repo.ts";
import { defined, pathExists } from "./helpers.ts";

const S_VARIANT_FEATURE_RE = /(\/\S*variant-feature-x-y-[\w-]+)/;
const VARIANT_FEATURE_X_RE = /^variant-feature-x-y-\d{4}-\d\d-\d\dT[\d-]+Z$/;

test("the variant results are copied to a folder that the output names, and the worktree is gone", async () => {
	const s = await setUp();
	const r = await run(s, "feature/x+y", 0);
	expect(r.status, r.stderr).toBe(0);
	const folders = await kept(s);
	expect(folders.length).toBe(1);
	expect(folders[0]).toMatch(VARIANT_FEATURE_X_RE);
	const folder = path.join(resultsRoot(s), defined(folders[0]));
	// The temp folder can be a link, so the paths are compared as real paths.
	const named = r.stdout.match(S_VARIANT_FEATURE_RE)?.[1];
	expect(named, r.stdout).toBeDefined();
	expect(fs.realpathSync.native(defined(named))).toBe(
		fs.realpathSync.native(folder),
	);
	const saved = await bunFile(path.join(folder, "run.txt")).text();
	// The file comes from the variant arm: the plugin path was in the worktree.
	expect(
		saved.startsWith(s.tmp) || saved.includes("claudetto-variant-"),
		saved,
	).toBeTruthy();
	expect(!(await pathExists(saved))).toBeTruthy();
	expect(await readdir(s.tmp)).toStrictEqual([]);
	// Git ignores the folder.
	expect(await git(s.repo, "status", "--porcelain")).toBe("");
});

test("the variant results survive when the eval fails", async () => {
	const s = await setUp();
	const r = await run(s, "HEAD", 1);
	expect(r.status).toBe(1);
	expect((await kept(s)).length).toBe(1);
});
