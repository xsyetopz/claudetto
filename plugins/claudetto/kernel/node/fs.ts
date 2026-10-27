// The `FileReader` of Node, for the CLIs, and the atomic write.

import fs from "node:fs/promises";
import { ABSENT, isExpected, rethrowUnless } from "../errors.ts";
import type { FileReader } from "../ports.ts";
import { RENAME_TRIES, RENAME_WAIT_MS } from "./limits.ts";

/** The `code` values of a rename that fails for a short time while another process holds the target open (a Windows file system). */
const BUSY_RENAME = ["EPERM", "EACCES", "EBUSY"];

type Rename = (from: string, to: string) => Promise<void>;

/** The result of `get`, or `fallback` when the error is one of `kinds`. */
const orElse = async <T>(
	get: () => Promise<T>,
	fallback: T,
	kinds = ["ENOENT"],
): Promise<T> => {
	try {
		return await get();
	} catch (err) {
		rethrowUnless(err, ...kinds);
		return fallback;
	}
};

const renameRetrying = async (
	rename: Rename,
	from: string,
	to: string,
	attempt = 1,
): Promise<void> => {
	try {
		return await rename(from, to);
	} catch (err) {
		if (attempt >= RENAME_TRIES || !isExpected(err, ...BUSY_RENAME)) {
			throw err;
		}
		await globalThis.Bun.sleep(RENAME_WAIT_MS);
		return renameRetrying(rename, from, to, attempt + 1);
	}
};

/** `writeAtomic` with the rename given as `rename`, so a test can make the rename fail. */
export const writeAtomicWith = async (
	rename: Rename,
	file: string,
	text: string,
): Promise<void> => {
	const target = await orElse(() => fs.realpath(file), file);
	const tmp = `${target}.${crypto.randomUUID()}.tmp`;
	try {
		await globalThis.Bun.write(tmp, text);
		const mode = await orElse(
			async () => (await fs.stat(target)).mode & 0o7777,
			null,
		);
		if (mode !== null) {
			await fs.chmod(tmp, mode);
		}
		await renameRetrying(rename, tmp, target);
	} catch (err) {
		await fs.rm(tmp, { force: true });
		throw err;
	}
};

/**
 * Writes `text` to `file` through a temp file in the same folder and a rename, so a reader never sees half a file.
 * A symlink stays a symlink, the temp file takes the mode of the file it replaces, and a rename splits a hard link.
 * The temp file is removed when the write fails.
 */
export const writeAtomic = (file: string, text: string): Promise<void> =>
	writeAtomicWith(fs.rename, file, text);

export const fileReader: FileReader = {
	read: (file) => orElse(() => globalThis.Bun.file(file).text(), null, ABSENT),
	list: (dir) => orElse(() => fs.readdir(dir), [], ABSENT),
};
