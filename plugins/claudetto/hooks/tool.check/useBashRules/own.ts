import type { EngineInterface } from "claude-code";

import { GATE_ENDLESS_WAIT, gateProtectedMove } from "../../texts-gate.ts";
import { isWriter } from "../../tools.ts";
import { endlessWait } from "./kill.ts";
import { commandVerdict, writeVerdict } from "./ownership.ts";
import type { Host, Recreation } from "./recreate.ts";
import { movesOf, protectedChanges } from "./switch.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";
import { namedPaths, spellsWall, walledVerdict } from "./walled.ts";

/** The protected paths, what the session saw of the files, and the names of the worktrees Claude Code made in it, which a verdict reads. */
export interface Walls {
	paths: readonly string[];
	files: Recreation;
	worktrees: Set<string>;
}

/** What the gate reads of the engine, built where `$` is in scope. */
export function hostOf($: EngineInterface): Host {
	return {
		cwd: () => $.session.cwd(),
		// The engine refuses a word that is no path it reaches, such as a `grep` pattern that starts with `/\`, and nothing is there.
		exists: (path) =>
			$.fs.exists(path).catch((error: unknown) => {
				$.ui.log(`The path ${path} was not checked (${String(error)})`);
				return false;
			}),
		realPath: async (path) => {
			const found = await $.fs
				.stat(path, { resolve: true })
				.catch((error: unknown) => {
					$.ui.log(`The path ${path} was not resolved (${String(error)})`);
				});
			return found?.realPath;
		},
		log: (message) => {
			$.ui.log(message);
		},
		list: (path) => $.fs.list(path),
		// `$.process` has no environment of its own; the shell that runs a command expands `~` from this one.
		home: async () => {
			const printed = await $.process.run(["printenv", "HOME"]);
			return printed.stdout;
		},
		past: async () => {
			const messages = await $.session.messages();
			return messages.flatMap((m) => m.toolUses);
		},
	};
}

/** The home folder, read once and kept in the recreation state. */
export async function homeOf($: EngineInterface, files: Recreation) {
	const awaited = await hostOf($).home();
	files.home ??= awaited.trim();
	return files.home;
}

async function wallVerdict(
	$: EngineInterface,
	walls: Walls,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> {
	const named = namedPaths(tool, input);
	return spellsWall(walls.paths, named)
		? walledVerdict(
				named,
				walls.paths,
				await homeOf($, walls.files),
				await $.session.cwd(),
			)
		: undefined;
}

const inBackground = (input: unknown): boolean =>
	typeof input === "object" &&
	input !== null &&
	"run_in_background" in input &&
	input.run_in_background === true;

// Seen live: a `git switch` stopped on the sandbox-denied `.claude/skills` files and left the tree half moved.
async function moveVerdict(
	$: EngineInterface,
	tool: string,
	command: string | undefined,
): Promise<Verdict | undefined> {
	const moves =
		tool === "Bash" && command !== undefined ? movesOf(command) : [];
	const touched = moves.length === 0 ? [] : await protectedChanges($, moves);
	return touched.length > 0 ? deny(gateProtectedMove(touched)) : undefined;
}

/** The verdict the gate itself gives a call, before the engine's own, or nothing. */
export async function ownVerdict(
	$: EngineInterface,
	walls: Walls,
	tool: string,
	input: unknown,
): Promise<Verdict | undefined> {
	const walled = await wallVerdict($, walls, tool, input);
	if (walled !== undefined) {
		return walled;
	}
	const command = fieldOf(input, "command");
	// Seen in another session: a background wait for four successes polled for 32 minutes after one job failed.
	if (
		tool === "Bash" &&
		command !== undefined &&
		inBackground(input) &&
		endlessWait(command)
	) {
		return deny(GATE_ENDLESS_WAIT);
	}
	const moved = await moveVerdict($, tool, command);
	if (moved !== undefined) {
		return moved;
	}
	if ((tool === "Bash" || tool === "Monitor") && command !== undefined) {
		return commandVerdict($, command, walls.worktrees);
	}
	const path = fieldOf(input, "file_path") ?? fieldOf(input, "notebook_path");
	if (!isWriter(tool) || path === undefined) {
		return undefined;
	}
	return writeVerdict(path);
}
