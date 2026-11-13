import { homedir } from "node:os";

import { withoutGitOptions } from "../hooks/shell/program-at";
import { parse, programOf } from "../hooks/shell/shell-words";
import { fieldOf } from "../hooks/shell/verdict";

// What Claude Code's sandbox denies writes to in a project folder on 2.1.323, found by writing to each path inside the sandbox; no call returns the list.
const SANDBOX_DENIED = [
	".claude/settings.json",
	".claude/settings.local.json",
	".claude/skills",
	".claude/hooks",
	".claude/commands",
	".claude/agents",
	".claude/workflows",
	".claude/routines",
	".claude/output-styles",
	".claude/launch.json",
	".claude/scheduled_tasks.json",
	".claude/loop.md",
	".claude/.cc-writes",
	".mcp.json",
];
const CREATES = new Set([
	"-c",
	"-C",
	"-b",
	"-B",
	"--create",
	"--force-create",
	"--orphan",
]);
const RESUMES = new Set(["--continue", "--abort", "--skip", "--quit"]);

/** What a git command moves the tree to: `from` is undefined when it is compared with the working tree, as `reset --hard` overwrites it. */
export interface Move {
	from: string | undefined;
	target: string;
}

const moveOf = (args: string[]): Move | undefined => {
	const [verb = "", ...rest] = withoutGitOptions(args);
	const plain = rest.filter((w) => !w.startsWith("-"));
	const creates = rest.some((w) => CREATES.has(w));
	// A created branch starts at its second word, or at HEAD, where nothing moves.
	const fromPrevious = rest.includes("-") ? "@{-1}" : plain[0];
	const named = creates ? plain[1] : fromPrevious;
	switch (verb) {
		case "switch": {
			return named === undefined ? undefined : { from: "HEAD", target: named };
		}
		case "checkout": {
			return named === undefined || rest.includes("--")
				? undefined
				: { from: "HEAD", target: named };
		}
		case "reset": {
			return rest.includes("--hard")
				? { from: undefined, target: plain[0] ?? "HEAD" }
				: undefined;
		}
		case "rebase": {
			return rest.some((w) => RESUMES.has(w))
				? undefined
				: { from: "HEAD", target: plain[0] ?? "@{upstream}" };
		}
		default: {
			return undefined;
		}
	}
};

export const movesOf = (command: string): Move[] =>
	parse(command).commands.flatMap((c) => {
		const { name, args } = programOf(c);
		return name === "git" ? (moveOf(args) ?? []) : [];
	});

/** The value under `keys`, one level each, or `undefined` where a level is no object or lacks the key. */
export const at = (value: unknown, ...[key, ...rest]: string[]): unknown => {
	if (key === undefined) {
		return value;
	}
	const held: unknown =
		typeof value === "object" && value !== null
			? Object.entries(value).find(([name]) => name === key)?.[1]
			: undefined;
	return at(held, ...rest);
};

const denyWriteOf = async (file: string): Promise<string[]> => {
	const settings: unknown = await Bun.file(file)
		.json()
		.catch(() => null);
	const list = at(settings, "sandbox", "filesystem", "denyWrite");
	return Array.isArray(list) ? list.map(String) : [];
};

/** The sandbox-protected files that differ between where each move starts and where it lands. */
export const protectedChanges = async (
	cwd: string,
	moves: readonly Move[],
): Promise<string[]> => {
	const held = await Promise.all(
		[
			`${homedir()}/.claude/settings.json`,
			`${cwd}/.claude/settings.json`,
			`${cwd}/.claude/settings.local.json`,
		].map((file) => denyWriteOf(file)),
	);
	// Only a path inside the project is a pathspec git takes; `~` is the shell's.
	const paths = [
		...SANDBOX_DENIED,
		...held
			.flat()
			.filter(
				(p) =>
					!(
						p.startsWith("~") ||
						(p.startsWith("/") && !p.startsWith(`${cwd}/`))
					),
			),
	];
	const found = await Promise.all(
		moves.map(async ({ from, target }) => {
			const argv = [
				"diff",
				"--name-only",
				...(from === undefined ? [] : [from]),
				target,
				"--",
				...paths,
			];
			const run = await Bun.$`git ${argv}`.cwd(cwd).quiet().nothrow();
			return run.exitCode === 0
				? run.stdout.toString().split("\n").filter(Boolean)
				: [];
		}),
	);
	return [...new Set(found.flat())];
};

/** The deny for a switch, checkout, hard reset, or rebase that would rewrite files the sandbox keeps the agent from writing. */
export const denyText = (files: readonly string[]): string =>
	`This command would rewrite files the sandbox denies you write to, so git would stop partway and leave the tree half moved:\n${files.map((f) => `- \`${f}\``).join("\n")}\nNothing ran. Ask the user to run the command as \`! <command>\`, or to commit or set aside these files first.`;

if (import.meta.main) {
	const input: unknown = await Bun.stdin.json();
	const moves = movesOf(fieldOf(at(input, "tool_input"), "command") ?? "");
	const files =
		moves.length === 0
			? []
			: await protectedChanges(fieldOf(input, "cwd") ?? process.cwd(), moves);
	if (files.length > 0) {
		process.stdout.write(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PreToolUse",
					permissionDecision: "deny",
					permissionDecisionReason: denyText(files),
				},
			}),
		);
	}
}
