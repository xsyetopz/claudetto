// Every test works on a copy, because `~/.claude.json` is the real file under test.

import { afterEach, describe, expect, test } from "bun:test";
import {
	mkdir,
	readdir,
	readFile,
	rm,
	utimes,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import { held, lockPath, underLock } from "../lock.ts";

const dirs: string[] = [];

afterEach(async () => {
	await Promise.all(
		dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
	);
});

const aConfig = async (text = '{"projects":{}}'): Promise<string> => {
	const dir = `/tmp/lock-${process.pid}-${Math.random()}`;
	dirs.push(dir);
	await mkdir(dir, { recursive: true });
	const file = path.join(dir, "config.json");
	await writeFile(file, text);
	return file;
};

describe("lockPath", () => {
	test("is the path Claude Code takes, which is the file name and `.lock`", () => {
		expect(lockPath("/home/me/.claude.json")).toBe(
			"/home/me/.claude.json.lock",
		);
	});
});

describe("held", () => {
	test("takes the lock and gives back a release that frees it", async () => {
		const file = await aConfig();

		const release = await held(file);

		expect(await readdir(path.dirname(file))).toContain("config.json.lock");
		await release();
		expect(await readdir(path.dirname(file))).not.toContain("config.json.lock");
	});

	test("refuses rather than write while a live holder has the lock", async () => {
		const file = await aConfig();
		await held(file);

		// The wait is short here; the round waits 15 seconds before it gives up.
		await expect(held(file, 300)).rejects.toThrow("held by a live process");
	});

	test("takes over a lock that a dead process left behind", async () => {
		const file = await aConfig();
		// A directory with an old mtime is what a killed holder leaves, and no retry would ever clear it.
		await mkdir(lockPath(file));
		const old = new Date(Date.now() - 60_000);
		await utimes(lockPath(file), old, old);

		const release = await held(file, 300);

		expect(release).toBeFunction();
		await release();
	});
});

describe("underLock", () => {
	test("writes what the edit returned and leaves no lock and no temporary file", async () => {
		const file = await aConfig('{"a":1}');

		await underLock(file, (before) => `${before.slice(0, -1)},"b":2}`);

		expect(await readFile(file, "utf8")).toBe('{"a":1,"b":2}');
		expect(await readdir(path.dirname(file))).toEqual(["config.json"]);
	});

	test("reads the text that is on disk when the lock is taken, not before", async () => {
		const file = await aConfig('{"a":1}');
		const release = await held(file);
		const writing = underLock(file, (before) => `${before}!`);
		// The holder changes the file before it releases, which is the race the lock exists for.
		await writeFile(file, '{"a":2}');
		await release();

		await writing;

		expect(await readFile(file, "utf8")).toBe('{"a":2}!');
	});

	test("frees the lock when the edit throws, so one failure does not block the round", async () => {
		const file = await aConfig();

		await expect(
			underLock(file, () => {
				throw new Error("edit failed");
			}),
		).rejects.toThrow("edit failed");
		expect(await readdir(path.dirname(file))).not.toContain("config.json.lock");
	});

	test("leaves the file as it was when the edit throws", async () => {
		const file = await aConfig('{"a":1}');

		await underLock(file, () => {
			throw new Error("edit failed");
		}).catch(() => undefined);

		expect(await readFile(file, "utf8")).toBe('{"a":1}');
	});
});
