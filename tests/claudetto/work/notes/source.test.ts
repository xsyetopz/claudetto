// The slice `notes` makes no model request (spec `side-notes`, "No Model Request"): no file of it calls `$.model`.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";

const PATTERN_1 = /\$\.model\b|model\.(complete|fork|classify)/;

const ROOT = path.join(
	import.meta.dir,
	"../../../../plugins/claudetto/modules/work/notes",
);

const sources = async (dir: string): Promise<string[]> => {
	const entries = await readdir(dir, { withFileTypes: true });
	const lists = await Promise.all(
		entries.map(async (entry) => {
			if (entry.isDirectory()) {
				return await sources(path.join(dir, entry.name));
			}
			return entry.name.endsWith(".ts") ? [path.join(dir, entry.name)] : [];
		}),
	);
	return lists.flat();
};

test("no file of the slice calls `$.model`", async () => {
	const files = await sources(ROOT);
	expect(files.length).toBeGreaterThan(3);
	const texts = await Promise.all(files.map((file) => bunFile(file).text()));
	for (const text of texts) {
		expect(text).not.toMatch(PATTERN_1);
	}
});
