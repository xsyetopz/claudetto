import { afterEach, describe, expect, test } from "bun:test";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	makeFolders,
	removeFolders,
	type SessionFolders,
	withFolders,
} from "../folders.ts";

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

const exists = async (path: string): Promise<boolean> => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

describe("removeFolders", () => {
	test("removes the root with what it holds, and a root that is gone is no error", async () => {
		made = await makeFolders(PREFIX, "{}");

		await removeFolders(made.root);
		await removeFolders(made.root);

		expect(await exists(made.root)).toBe(false);
	});
});

describe("withFolders", () => {
	test("removes the root when the use ends, and gives back what the use returned", async () => {
		let root = "";

		const got = await withFolders(PREFIX, undefined, (folders) => {
			root = folders.root;
			return Promise.resolve(folders.work.length);
		});

		expect(got).toBeGreaterThan(0);
		expect(await exists(root)).toBe(false);
	});

	test("removes the root when the use throws, and the error still reaches the caller", async () => {
		let root = "";

		const failed = withFolders(PREFIX, undefined, (folders) => {
			root = folders.root;
			return Promise.reject(new Error("the session failed"));
		});

		await expect(failed).rejects.toThrow("the session failed");
		expect(await exists(root)).toBe(false);
	});
});
