import { type Facts, gate } from "../gate.ts";

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
