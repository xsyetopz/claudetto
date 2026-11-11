import { onTestFinished } from "bun:test";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A new temp folder, by its real path, that goes when the test that asked for it ends. */
export const tempDir = async (prefix: string): Promise<string> => {
	const dir = await realpath(await mkdtemp(join(tmpdir(), prefix)));
	onTestFinished(() => rm(dir, { recursive: true, force: true }));
	return dir;
};
