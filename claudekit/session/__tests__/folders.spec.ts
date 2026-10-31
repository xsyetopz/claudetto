import { afterEach, describe, expect, test } from "bun:test";
import { readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeFolders, type SessionFolders } from "../folders.ts";

const PREFIX = join(tmpdir(), "claudekit-folders-");

let made: SessionFolders | undefined;

afterEach(async () => {
	if (made !== undefined) {
		await rm(made.root, { recursive: true, force: true });
	}
	made = undefined;
});

describe("makeFolders", () => {
	test("makes an empty config folder and an empty working folder under the prefix", async () => {
		made = await makeFolders(PREFIX);

		expect(made.root.startsWith(PREFIX)).toBe(true);
		expect(await readdir(made.config)).toEqual([]);
		expect(await readdir(made.work)).toEqual([]);
	});

	test("writes the given settings into the config folder", async () => {
		made = await makeFolders(PREFIX, '{"a":1}');

		expect(await readFile(join(made.config, "settings.json"), "utf8")).toBe(
			'{"a":1}',
		);
	});
});
