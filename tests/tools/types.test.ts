// Behavior of the copy of the Claude Code types into a linked worktree (`tools/types.ts`), in a temporary git repository.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { $, file as bunFile, write as bunWrite } from "bun";
import { copyTypes, mainWorktree } from "../../tools/types.ts";
import { tmpDir } from "../support/repo.ts";

/** Orders two paths by code unit, as the default sort does. */
const compare = (a: string, b: string): number => Number(a > b) - Number(a < b);

const TYPES = path.join("plugins", "q", ".claude-plugin", "types");
const INDEX = path.join(TYPES, "claude-code", "index.d.ts");
const CONFIG = path.join("plugins", "q", "tsconfig.json");

/** A main worktree with the plugin `plugins/q`, its Claude Code types, and its `tsconfig.json`, and a linked worktree of it. */
const repoWithWorktree = async (): Promise<{ main: string; wt: string }> => {
	const main = fs.realpathSync.native(await tmpDir("types-main"));
	await $`git init -q`.cwd(main);
	await bunWrite(path.join(main, ".gitignore"), "tsconfig.json\ntypes/\n");
	await bunWrite(path.join(main, "plugins", "q", "a.txt"), "a\n");
	await $`git add -A`.cwd(main);
	await $`git -c user.name=t -c user.email=t@example.com -c commit.gpgsign=false commit -qm init`.cwd(
		main,
	);
	await bunWrite(path.join(main, INDEX), "declare const x: 1;\n");
	await bunWrite(path.join(main, CONFIG), "{}\n");
	const wt = path.join(fs.realpathSync.native(await tmpDir("types-wt")), "wt");
	await $`git worktree add -q --detach ${wt}`.cwd(main);
	return { main, wt };
};

test("a linked worktree names its main worktree, and the main worktree names none", async () => {
	const { main, wt } = await repoWithWorktree();
	expect(fs.realpathSync.native((await mainWorktree(wt)) ?? "")).toBe(main);
	expect(await mainWorktree(main)).toBeNull();
});

test("the copy gives the worktree the types and the `tsconfig.json` of each plugin, and a second copy copies nothing", async () => {
	const { main, wt } = await repoWithWorktree();
	expect((await copyTypes(main, wt)).sort(compare)).toEqual(
		[TYPES, CONFIG].sort(compare),
	);
	expect(await bunFile(path.join(wt, INDEX)).text()).toBe(
		"declare const x: 1;\n",
	);
	expect(await copyTypes(main, wt)).toEqual([]);
});

test("the copy keeps a file that the worktree has", async () => {
	const { main, wt } = await repoWithWorktree();
	await bunWrite(path.join(wt, CONFIG), '{ "own": true }\n');
	expect(await copyTypes(main, wt)).toEqual([TYPES]);
	expect(await bunFile(path.join(wt, CONFIG)).text()).toBe('{ "own": true }\n');
});
