// The fakes of the gate tests: the facts of a project at `/p` with a stubbed `git`, so `gate()` runs with no model call.

import { type Facts, gate } from "../gate.ts";

/** The facts of a project at `/p`, with a `git` that gives `dirty` for each path that holds a name of `dirty`. `runs` records each `git` or ledger read. */
export const facts = (
	...dirty: string[]
): Facts & { runs: string[][]; users: string[] } => {
	const runs: string[][] = [];
	const users: string[] = [];
	return {
		cwd: "/p",
		home: "/u",
		tmp: "/t",
		temps: ["/t", "/tmp", "/private/tmp"],
		runs,
		users,
		hasEnvFile: async () => [],
		userEdits: async (dir) => {
			runs.push(["userEdits", dir]);
			return users;
		},
		git: async (scope, dir, paths) => {
			runs.push([scope, dir, ...paths]);
			const all = paths.length > 0 ? paths : [dir];
			return all.some((p) => dirty.some((d) => p.includes(d)))
				? "dirty"
				: "clean";
		},
	};
};

export const bash = (command: string, f: Facts = facts()) =>
	gate({ tool: "Bash", input: { command } }, f);
