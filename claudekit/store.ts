import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { LAST_KEY, readingOf } from "./plugin.ts";

const STORE_DIR = ".claude/plugins/store";

const STORE_NAME = "claudetto_inline-";

export const storeFiles = async (home: string): Promise<unknown[]> => {
	const dir = path.join(home, STORE_DIR);
	const names = (await readdir(dir)).filter((n) => n.startsWith(STORE_NAME));
	const files = await Promise.all(
		names.map(async (n) => {
			const json: unknown = JSON.parse(
				await readFile(path.join(dir, n), "utf8"),
			);
			return { at: (await stat(path.join(dir, n))).mtimeMs, json };
		}),
	);
	return files.toSorted((l, r) => l.at - r.at).map((f) => f.json);
};

export const storedAt = (file: unknown, key: string): unknown =>
	typeof file === "object" && file !== null
		? Object.entries(file).find(([k]) => k === key)?.[1]
		: undefined;

export const lastSevenDay = async (
	home: string,
): Promise<number | undefined> => {
	try {
		const files = await storeFiles(home);
		return files
			.map((f) => readingOf(storedAt(f, LAST_KEY))?.sevenDay)
			.findLast((v) => v !== undefined);
	} catch {
		return undefined;
	}
};
