import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { sleep, spawn } from "bun";

import { parseArgs } from "../../plugins/claudetto/hygiene/args.ts";
import { sweep } from "../../plugins/claudetto/hygiene/sweep.ts";
import { tempDir } from "../temp.mock.ts";

export const DAY = 86_400_000;
export const NOW = Date.now();
export const UID = process.getuid?.() ?? 0;

export const git = (cwd: string, ...args: string[]) =>
	spawn(["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args], {
		cwd,
	}).exited;

/** A repo that ignores `.build/` and tracks `dist/`, with one worktree under `.claude/worktrees/w`. */
export const repo = async () => {
	const root = await tempDir("trash-");
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

export const logged: string[] = [];
export const host = (root: string, proj: string) => ({
	cwd: proj,
	projects: [],
	home: join(root, "home"),
	now: NOW,
	uid: UID,
	days: 30,
	tempBases: [join(root, "tmp")],
	configDir: join(root, "home/.claude"),
	log: (line: string) => logged.push(line),
});

export const swept = async (
	root: string,
	proj: string,
	argv: string[] = [],
) => {
	const report = await sweep(parseArgs(argv), host(root, proj));
	return report.removed.map((item) => [item.kind, item.path]);
};

/** What a sweep finds while a process outside the project holds `file` open. */
export const sweptWhileOpen = async (
	root: string,
	proj: string,
	file: string,
) => {
	const reader = spawn(["tail", "-f", file], { cwd: root, stdout: "ignore" });
	await sleep(200);
	const found = await swept(root, proj);
	reader.kill();
	return found;
};
