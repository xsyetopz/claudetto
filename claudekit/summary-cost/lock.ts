import {
	mkdir,
	readFile,
	rename,
	rmdir,
	stat,
	writeFile,
} from "node:fs/promises";

export const lockPath = (file: string): string => `${file}.lock`;

const STALE_MS = 20_000;

const WAIT_MS = 15_000;

const STEP_MS = 100;

const exists = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	error.code === "EEXIST";

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const heldForMs = async (file: string): Promise<number | undefined> => {
	try {
		return Date.now() - (await stat(lockPath(file))).mtimeMs;
	} catch {
		return undefined;
	}
};

/** Throws when the wait runs out, because a write without the lock loses another session's change. */
export const held = (
	file: string,
	wait: number = WAIT_MS,
): Promise<() => Promise<void>> => attempt(file, Date.now() + wait);

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

/** Writes a temporary file and renames it, so a crash never leaves a half-written config. */
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
