import { expect, test } from "bun:test";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { file } from "bun";
import { MINIMUM_VERSION } from "../../tiers/disables.ts";
import { CATALOG } from "../catalog.ts";

const LAB = join(import.meta.dir, "..", "..", "..", "tests");

const SOURCE = join(import.meta.dir, "..", "catalog.ts");

const LAB_SUFFIX = /\.test\.ts$/;

const parts = (version: string): readonly number[] =>
	version.split(".").map(Number);

const atOrBelow = (version: string, floor: string): boolean => {
	const [a, b] = [parts(version), parts(floor)];
	const differs = a.findIndex((part, index) => part !== b[index]);
	return differs === -1 || (a[differs] ?? 0) < (b[differs] ?? 0);
};

const pascal = (id: string): string =>
	id.replace(/(^|-)(\w)/g, (_match, _dash, letter: string) =>
		letter.toUpperCase(),
	);

test("each block id is used once", () => {
	const ids = CATALOG.map((block) => block.id);
	expect(new Set(ids).size).toBe(ids.length);
});

test.each(CATALOG.map((block) => [block.id, block] as const))(
	"`%s` needs no Claude Code above the version floor",
	(_id, block) => {
		expect(atOrBelow(block.needs, MINIMUM_VERSION)).toBe(true);
	},
);

const isFolder = async (path: string): Promise<boolean> => {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
};

test.each(CATALOG.map((block) => [block.id] as const))(
	"`%s` has a hook lab file or folder named after it",
	async (id) => {
		const named =
			(await file(join(LAB, `${id}.test.ts`)).exists()) ||
			(await isFolder(join(LAB, id)));
		expect(named).toBe(true);
	},
);

test("each hook lab file or folder is named after a block", async () => {
	const ids = new Set(CATALOG.map((block) => block.id));
	const entries = await readdir(LAB);
	const strays = entries.filter(
		(entry) => !ids.has(entry.replace(LAB_SUFFIX, "")),
	);
	expect(strays).toEqual([]);
});

test.each(CATALOG.map((block) => [block.id] as const))(
	"`attachBlocks` calls the attach function of `%s`",
	async (id) => {
		const source = await file(SOURCE).text();
		expect(source).toContain(`attach${pascal(id)}(on, context);`);
	},
);

test("the version comparison orders by number, not by text", () => {
	expect(atOrBelow("2.1.99", "2.1.314")).toBe(true);
	expect(atOrBelow("2.1.315", "2.1.314")).toBe(false);
	expect(atOrBelow("2.1.314", "2.1.314")).toBe(true);
});
