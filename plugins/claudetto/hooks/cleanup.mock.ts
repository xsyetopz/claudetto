import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { quietDecider } from "./decider/decider.mock";
import { scanned } from "./secrets.mock";

export interface Call {
	command: string;
	text?: string;
	tool?: string;
}

interface Refusals {
	dirty?: string[];
	unmerged?: string[];
	gone?: string[];
	/** The agent worktrees git lists, by name: one whose commits the branch has, one with a new commit, or one an agent still holds. */
	agents?: Record<string, "free" | "ahead" | "locked">;
}

export const agentPath = (name: string): string =>
	`/repo/.claude/worktrees/${name}`;

/** What git prints: the worktree list, with each agent's name as its `HEAD`, and a `+` line from `git cherry` for an agent with a new commit. */
const stdoutOf = (argv: readonly string[], state: Refusals): string => {
	const [, verb, sub, target = ""] = argv;
	if (verb === "worktree" && sub === "list") {
		return Object.entries(state.agents ?? {})
			.map(
				([name, kind]) =>
					`worktree ${agentPath(name)}\nHEAD ${name}\nbranch refs/heads/worktree-${name}${kind === "locked" ? "\nlocked claude agent" : ""}\n`,
			)
			.join("\n");
	}
	return verb === "cherry" && state.agents?.[target] === "ahead"
		? "+ c1\n"
		: "";
};

interface Task {
	id: string;
	type: string;
	status: string;
	description: string;
}

const exit = (code: number, stdout: string) => ({
	value: {
		exitCode: code,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

const exitOf = (argv: readonly string[], state: Refusals): number => {
	const [, verb, , target = ""] = argv;
	if (verb === "worktree") {
		return argv[2] === "remove" && state.dirty?.includes(target) === true
			? 1
			: 0;
	}
	if (verb === "branch") {
		return [...(state.unmerged ?? []), ...(state.gone ?? [])].includes(target)
			? 1
			: 0;
	}
	if (verb === "show-ref") {
		const ref = argv.at(-1);
		return state.unmerged?.some((b) => ref === `refs/heads/${b}`) === true
			? 0
			: 1;
	}
	return 0;
};

const wireSession = (
	on: On,
	past: Record<string, Call[]>,
	existing: readonly string[],
): void => {
	quietDecider(on);
	on("classic.Stop", () => ({}));
	on("classic.SubagentStop", () => ({}));
	on("session.id", () => ({ value: "S1" }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("tool.list", () => ({ value: [] }));
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", (_$, e) => ({ value: existing.includes(e.path) }));
	on("session.messages", (_$, e) => ({
		value: [
			{
				role: "assistant",
				text: "",
				toolUses: (past[e?.agentId ?? ""] ?? []).map((p, i) => ({
					tool: p.tool ?? "Bash",
					tool_use_id: `${i}`,
					input: { command: p.command },
					text: p.text ?? "",
				})),
			},
		],
	}));
};

/** A repo at /repo where `dirty` worktrees and `unmerged` branches refuse plain removal, and so does each `gone` branch, which no longer exists; `past` maps an agent id ("" for the main loop) to its calls; `existing` lists the paths that are there. */
export const lab = (
	on: On,
	past: Record<string, Call[]>,
	existing: readonly string[] = [],
	state: Refusals = {},
	runs: string[][] = [],
): void => {
	on("process.run", (_$, e) => {
		const found = scanned(e);
		if (found) {
			return found;
		}
		runs.push([...e.argv]);
		return exit(exitOf(e.argv, state), stdoutOf(e.argv, state));
	});
	wireSession(on, past, existing);
};

export const stop = ($: Engine, reply = "Done.", tasks: Task[] = []) =>
	$.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: reply,
		background_tasks: tasks,
	});

export const MONITOR: Task = {
	id: "m7",
	type: "monitor",
	status: "running",
	description: "build end",
};
export const SHELL: Task = {
	id: "b1",
	type: "shell",
	status: "running",
	description: "dev server",
};
export const ARMED: Call[] = [
	{ command: "git worktree add /w/armed" },
	{
		tool: "Monitor",
		command: "",
		text: "Monitor started (task m7, expires in 300s unless the source ends first).",
	},
	{
		command: "bun run dev",
		text: "Command running in background with ID: b1. Output is being written to: /t/b1",
	},
];
