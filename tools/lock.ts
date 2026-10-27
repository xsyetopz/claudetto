#!/usr/bin/env -S bun --no-env-file
// Lets only one long run of the checkout run at a time: a paid eval, or a check (`just check`, `just docker`).
// Two runs at the same time cost twice, and they write over the logs and results of each other.
//
//   bun tools/lock.ts [--name eval|check] COMMAND [ARGS...]   run the command while the lock is held
//
// The `eval` lock (default) is a file in `plugins/claudetto/evals/results/`, which git ignores.
// The `check` lock is a file in `node_modules/.cache/`, which git ignores.
// The folder `node_modules/` of a container is a volume, so a check in a container has its own lock.
// A lock holds the process id, the start time, and the owner (the name) of the run that has it,
// and then the process id of the command that the run started.
// A tool error (the lock or the start of the command fails) ends with `TOOL_ERROR_CODE`, which is not an exit code of the command,
// and a lock that another run holds ends with `HELD_CODE`, so neither one is a negative result of the command.
// To stop a run, stop the process of its PID in the lock file, and no other process.
// The lock holds while one of the two processes lives, so a stopped run does not free the lock of its paid command.
// A lock whose processes are all gone is stale, and the next run takes it.
// When the check of a process fails for any other reason, the lock counts as held,
// because a failed check does not show that the run is gone.
//
// Each change of the lock file is one atomic step, so two runs cannot both take it:
// - A run takes the lock with a hard link of its own full file, which fails when the lock exists.
// - A run removes a stale lock only while it holds `<lock>.break`, which it takes with a hard link, and only when the text is still the stale text that it read.
//   A run that finds `<lock>.break` counts the lock as held.
// - A run changes its lock with a rename over it, and releases it only when the text is still its own.

import { link, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, spawn, write } from "bun";

const REPO = path.resolve(import.meta.dir, "..");
export const LOCK = path.join(
	REPO,
	"plugins/claudetto/evals/results/.eval.lock",
);
/** The lock files by name. The name is also the owner in the lock file. */
export const LOCKS: Record<string, string> = {
	eval: LOCK,
	check: path.join(REPO, "node_modules/.cache/claudetto/.check.lock"),
};
/** The exit code when another run holds the lock (`EX_TEMPFAIL`). */
export const HELD_CODE = 75;
/** The exit code when the lock or the start of the command fails (`EX_SOFTWARE`). It is not a result of the command. */
export const TOOL_ERROR_CODE = 70;

/** A lock that this run holds. `hold` adds the process id of the command that the run started. */
export interface Lock {
	readonly release: () => Promise<void>;
	readonly hold: (child: number) => Promise<void>;
}

const WHITESPACE = /\s+/;
const DIGITS = /^\d+$/;

/** The `code` of the error `e` (`ENOENT`, `EEXIST`, ...), or undefined when it has none. */
const codeOf = (e: unknown): string | undefined =>
	typeof e === "object" &&
	e !== null &&
	"code" in e &&
	typeof e.code === "string"
		? e.code
		: undefined;

/** The message of the error `e`. */
const messageOf = (e: unknown): string =>
	e instanceof Error ? e.message : String(e);

/** True unless the process is certainly gone (`ESRCH`). */
const isAlive = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (e) {
		return codeOf(e) !== "ESRCH";
	}
};

/** The process ids in the text of a lock. The start time is not a number, so it is not one of them. */
export const pidsOf = (text: string): number[] =>
	text
		.split(WHITESPACE)
		.filter((part) => DIGITS.test(part))
		.map(Number);

/** The text of `file`, or null when it does not exist. */
const readText = async (file: string): Promise<string | null> => {
	try {
		return await bunFile(file).text();
	} catch (e) {
		if (codeOf(e) === "ENOENT") {
			return null;
		}
		throw e;
	}
};

/**
 * Removes the stale lock `file` when its text is still `seen`, and says whether this run could try.
 * Only the run that holds `<file>.break` removes a stale lock, so no run removes a lock that another run took after the read of `seen`.
 */
const removeStale = async (
	file: string,
	seen: string,
	own: string,
): Promise<boolean> => {
	const brk = `${file}.break`;
	try {
		await link(own, brk);
	} catch (e) {
		if (codeOf(e) === "EEXIST") {
			return false;
		}
		throw e;
	}
	try {
		if ((await readText(file)) === seen) {
			await rm(file, { force: true });
		}
	} finally {
		await rm(brk, { force: true });
	}
	return true;
};

/** The lock of `file`, which this run took with the text `text`. */
const held = (file: string, pid: number, text: string): Lock => {
	let mine = text;
	return {
		release: async () => {
			if ((await readText(file)) === mine) {
				await rm(file, { force: true });
			}
		},
		hold: async (child) => {
			const next = `${mine.trimEnd()} ${child}\n`;
			const temp = `${file}.${pid}`;
			await write(temp, next);
			await rename(temp, file);
			mine = next;
		},
	};
};

/** Takes the lock, or gives the holder when another live run has it. */
export const takeLock = async (
	file: string,
	pid: number = process.pid,
	owner = "eval",
): Promise<Lock | { holder: string }> => {
	await mkdir(path.dirname(file), { recursive: true });
	const text = `${pid} ${new Date().toISOString()} ${owner}\n`;
	const own = `${file}.${pid}`;
	await write(own, text);
	const attempt = async (left: number): Promise<Lock | { holder: string }> => {
		if (left === 0) {
			return { holder: ((await readText(file)) ?? "").trim() };
		}
		try {
			await link(own, file);
			return held(file, pid, text);
		} catch (e) {
			if (codeOf(e) !== "EEXIST") {
				throw e;
			}
		}
		const holder = await readText(file);
		if (holder === null) {
			return attempt(left - 1);
		}
		if (pidsOf(holder).some(isAlive)) {
			return { holder: holder.trim() };
		}
		if (!(await removeStale(file, holder, own))) {
			return { holder: holder.trim() };
		}
		return attempt(left - 1);
	};
	try {
		return await attempt(2);
	} finally {
		await rm(own, { force: true });
	}
};

/**
 * Runs `argv` while this run holds the lock `file` for `owner`, and returns the exit code.
 * It returns `HELD_CODE` when another run holds the lock, and `TOOL_ERROR_CODE` when the lock or the start of the command fails.
 */
export const runLocked = async (
	file: string,
	argv: string[],
	owner = "eval",
): Promise<number> => {
	let lock: Awaited<ReturnType<typeof takeLock>>;
	try {
		lock = await takeLock(file, process.pid, owner);
	} catch (e) {
		console.error(
			`The lock failed: ${messageOf(e)}\nThis is a tool error, not a result of the command, and the command did not run.`,
		);
		return TOOL_ERROR_CODE;
	}
	if ("holder" in lock) {
		console.error(
			`A run is in progress (process, start, owner, and command process: ${lock.holder}).\nWait for it to end, and do not start a second run.\nIf no run is in progress, remove ${file} and ${file}.break.\nTo stop the run, stop its process by the PID in the lock file.`,
		);
		return HELD_CODE;
	}
	try {
		const child = spawn(argv, {
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		await lock.hold(child.pid);
		return (await child.exited) ?? 1;
	} catch (e) {
		console.error(
			`The command did not start: ${messageOf(e)}\nThis is a tool error, not a result of the command.`,
		);
		return TOOL_ERROR_CODE;
	} finally {
		await lock.release();
	}
};

if (process.argv[1] === import.meta.path) {
	let argv = process.argv.slice(2);
	let name = "eval";
	if (argv[0] === "--name") {
		name = argv[1] ?? "";
		argv = argv.slice(2);
	}
	const file = LOCKS[name];
	if (file === undefined || argv.length === 0) {
		console.error(
			"Usage: bun tools/lock.ts [--name eval|check] COMMAND [ARGS...]",
		);
		process.exitCode = 2;
	} else {
		process.exitCode = await runLocked(file, argv, name);
	}
}
