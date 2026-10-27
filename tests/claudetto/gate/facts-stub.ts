// The fakes of the gate tests: the facts of a project at `/p` with a stubbed `git`, and the helpers that run the gate on command strings.

import {
	type Facts,
	gate,
} from "../../../plugins/claudetto/modules/gate/domain/gate.ts";

/** The facts of a project at `/p`, with a `git` that gives `dirty` for each path in `dirty`. The files in `users` are the changes that the ledger does not know. */
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
/** Each command with its verdict, in the order of `commands`. */
export const verdictsOf = (commands: readonly string[], f?: Facts) =>
	Promise.all(commands.map(async (c) => [c, await bash(c, f)] as const));
/** The commands of `commands` that are not allowed, and the processes that the check ran. */
export const unreadOf = async (
	commands: readonly string[],
	f: ReturnType<typeof facts>,
) => ({
	refused: (await verdictsOf(commands, f))
		.filter(([, v]) => v.decision !== "allow")
		.map(([command]) => command),
	runs: f.runs,
});
export const decisions = async (commands: string[]) =>
	Promise.all(commands.map(async (c) => [c, (await bash(c)).decision]));
