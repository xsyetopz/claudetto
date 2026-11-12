import type { EngineInterface } from "claude-code";

import { parse, programOf } from "./shell-words";
import { withoutGitOptions } from "./upstream";

// What Claude Code's sandbox denies writes to in a project folder, as its 2.1.319 build lists them (`chunk-fcp0yk24.js`); no engine call returns the list.
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
interface Move {
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

const denyWriteOf = (sandbox: unknown): string[] => {
	const fs =
		typeof sandbox === "object" && sandbox !== null && "filesystem" in sandbox
			? sandbox.filesystem
			: undefined;
	const list =
		typeof fs === "object" && fs !== null && "denyWrite" in fs
			? fs.denyWrite
			: undefined;
	return Array.isArray(list) ? list.map(String) : [];
};

/** The sandbox-protected files that differ between where each move starts and where it lands. */
export async function protectedChanges(
	$: EngineInterface,
	moves: readonly Move[],
): Promise<string[]> {
	const cwd = await $.session.cwd();
	// Only a path inside the project is a pathspec git takes; `~` is the shell's.
	const paths = [
		...SANDBOX_DENIED,
		...denyWriteOf(await $.settings.read({ key: "sandbox" })).filter(
			(p) =>
				!(p.startsWith("~") || (p.startsWith("/") && !p.startsWith(`${cwd}/`))),
		),
	];
	const found = await Promise.all(
		moves.map(async ({ from, target }) => {
			const r = await $.process
				.run([
					"git",
					"diff",
					"--name-only",
					...(from === undefined ? [] : [from]),
					target,
					"--",
					...paths,
				])
				.catch((error: unknown) => {
					$.ui.log(`The git diff call failed (${String(error)})`);
				});
			return r?.exitCode === 0
				? r.stdout.split("\n").filter((f) => f !== "")
				: [];
		}),
	);
	return [...new Set(found.flat())];
}
