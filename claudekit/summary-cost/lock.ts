// The lock that guards `~/.claude.json`, which every live Claude Code session writes.
//
// Claude Code uses `proper-lockfile` for it: the lock is a directory at `<file>.lock`, taken with
// `mkdir`, whose mtime is refreshed while it is held, and a holder older than the stale window may
// be taken over (`chunk-091chc8g.js:18469`). A session that cannot take it refuses the write rather
// than clobber the holder: `Config lock still held by a live process after retries; skipping the
// unlocked fallback write (save_global) to avoid clobbering the lock holder`.
//
// The round writes the same file to answer the folder-trust dialog, so it takes the same lock. The
// round of 2026-10-29 did not, and its own arms logged that contention 8 times. Two unlocked
// read-modify-writes of a 116 KB config each drop the other's change, and a crash between the
// truncate and the write leaves no config at all.

import {
	mkdir,
	readFile,
	rename,
	rmdir,
	stat,
	writeFile,
} from "node:fs/promises";

/** The lock of a file, which is a directory next to it. */
export const lockPath = (file: string): string => `${file}.lock`;

/** How old a holder may be before it counts as dead and may be taken over. */
const STALE_MS = 20_000;

/** How long to wait for a live holder before giving up on the write. */
const WAIT_MS = 15_000;

const STEP_MS = 100;

const exists = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	error.code === "EEXIST";

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/** How long the lock of `file` has been held, or nothing when it is not held. */
const heldForMs = async (file: string): Promise<number | undefined> => {
	try {
		return Date.now() - (await stat(lockPath(file))).mtimeMs;
	} catch {
		return undefined;
	}
};

/**
 * Takes the lock of `file` and gives back the release. It waits while a live holder has it and
 * throws when the wait runs out, because a write that cannot take the lock is the write that loses
 * another session's change.
 */
export const held = (
	file: string,
	wait: number = WAIT_MS,
): Promise<() => Promise<void>> => attempt(file, Date.now() + wait);

/** One try for the lock of `file`, which waits and tries again until `until` passes. */
const attempt = async (
	file: string,
	until: number,
): Promise<() => Promise<void>> => {
	try {
		await mkdir(lockPath(file));
		return async (): Promise<void> => {
			await rmdir(lockPath(file)).catch(() => undefined);
		};
	} catch (error) {
		if (!exists(error)) {
			throw error;
		}
	}
	const age = await heldForMs(file);
	if (age === undefined || age > STALE_MS) {
		// Either the holder released it in the meantime, or it died and left the directory behind.
		await rmdir(lockPath(file)).catch(() => undefined);
		return attempt(file, until);
	}
	if (Date.now() >= until) {
		throw new Error(
			`${lockPath(file)} is held by a live process. Close the other Claude Code session and run the round again.`,
		);
	}
	await sleep(STEP_MS);
	return attempt(file, until);
};

/**
 * Replaces `file` under its lock, from the text that `edit` makes out of the current text. The new
 * text goes to a temporary file in the same folder and is renamed over the old one, so a crash
 * leaves either the old config or the new one and never a half-written one.
 */
export const underLock = async (
	file: string,
	edit: (before: string) => Promise<string> | string,
	wait?: number,
): Promise<void> => {
	const release = await held(file, wait);
	try {
		const before = await readFile(file, "utf8").catch(() => "");
		const next = await edit(before);
		const temp = `${file}.${process.pid}.tmp`;
		await writeFile(temp, next);
		await rename(temp, file);
	} finally {
		await release();
	}
};
