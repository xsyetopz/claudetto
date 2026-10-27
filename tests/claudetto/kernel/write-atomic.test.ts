// Tests of `writeAtomic` in `plugins/claudetto/kernel/node/fs.ts`: the file gets the text, and no temp file stays in its folder.

import { expect, test } from "bun:test";
import {
	chmod,
	rename as fsRename,
	lstat,
	mkdir,
	mkdtemp,
	readdir,
	stat,
	symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write } from "bun";
import {
	writeAtomic,
	writeAtomicWith,
} from "../../../plugins/claudetto/kernel/node/fs.ts";
import { RENAME_TRIES } from "../../../plugins/claudetto/kernel/node/limits.ts";

const folder = (): Promise<string> =>
	mkdtemp(path.join(os.tmpdir(), "atomic-"));

const failure = (code: string): Error =>
	Object.assign(new Error(`${code}: the file is in use`), { code });

test("`writeAtomic` replaces the text of a file and leaves only that file in its folder", async () => {
	const dir = await folder();
	const file = path.join(dir, "rate-limits.jsonl");
	await write(file, "old");
	await writeAtomic(file, "new");
	expect(await bunFile(file).text()).toBe("new");
	expect(await readdir(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomic` fails and leaves no temp file when the rename onto the file fails", async () => {
	const dir = await folder();
	const target = path.join(dir, "settings.json");
	await mkdir(target);
	let failed = false;
	try {
		await writeAtomic(target, "new");
	} catch {
		failed = true;
	}
	expect(failed).toBe(true);
	expect(await readdir(dir)).toStrictEqual(["settings.json"]);
});

test("`writeAtomic` fails and leaves no temp file when the folder of the file is not a folder", async () => {
	const dir = await folder();
	const blocker = path.join(dir, "blocker");
	await write(blocker, "x");
	let failed = false;
	try {
		await writeAtomic(path.join(blocker, "rate-limits.jsonl"), "new");
	} catch {
		failed = true;
	}
	expect(failed).toBe(true);
	expect(await readdir(dir)).toStrictEqual(["blocker"]);
});

test("`writeAtomicWith` retries a rename that fails with `EPERM` and then replaces the file", async () => {
	const dir = await folder();
	const file = path.join(dir, "rate-limits.jsonl");
	await write(file, "old");
	let calls = 0;
	const rename = async (from: string, to: string): Promise<void> => {
		calls += 1;
		if (calls <= 2) {
			throw failure("EPERM");
		}
		await fsRename(from, to);
	};
	await writeAtomicWith(rename, file, "new");
	expect(calls).toBe(3);
	expect(await bunFile(file).text()).toBe("new");
	expect(await readdir(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomicWith` rethrows the error after its last try and removes the temp file", async () => {
	const dir = await folder();
	const file = path.join(dir, "rate-limits.jsonl");
	await write(file, "old");
	let calls = 0;
	const rename = async (): Promise<void> => {
		calls += 1;
		throw failure("EBUSY");
	};
	let caught: unknown;
	try {
		await writeAtomicWith(rename, file, "new");
	} catch (err) {
		caught = err;
	}
	expect(caught).toMatchObject({ code: "EBUSY" });
	expect(calls).toBe(RENAME_TRIES);
	expect(await bunFile(file).text()).toBe("old");
	expect(await readdir(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomicWith` does not retry a rename that fails with another code", async () => {
	const dir = await folder();
	const file = path.join(dir, "rate-limits.jsonl");
	let calls = 0;
	const rename = async (): Promise<void> => {
		calls += 1;
		throw failure("ENOENT");
	};
	await expect(writeAtomicWith(rename, file, "new")).rejects.toThrow("ENOENT");
	expect(calls).toBe(1);
	expect(await readdir(dir)).toStrictEqual([]);
});

test("`writeAtomicWith` keeps the old text when a rename fails without a retry", async () => {
	const dir = await folder();
	const file = path.join(dir, "settings.json");
	await write(file, "old");
	const rename = async (): Promise<void> => {
		throw failure("ENOSPC");
	};
	await expect(writeAtomicWith(rename, file, "new")).rejects.toThrow("ENOSPC");
	expect(await bunFile(file).text()).toBe("old");
	expect(await readdir(dir)).toStrictEqual(["settings.json"]);
});

test("`writeAtomic` writes through a symlink, so the link stays and the linked file gets the text", async () => {
	const dir = await folder();
	const real = path.join(dir, "dotfiles-settings.json");
	const link = path.join(dir, "settings.json");
	await write(real, "old");
	await symlink(real, link);
	await writeAtomic(link, "new");
	expect((await lstat(link)).isSymbolicLink()).toBe(true);
	expect(await bunFile(real).text()).toBe("new");
	expect((await readdir(dir)).sort()).toStrictEqual([
		"dotfiles-settings.json",
		"settings.json",
	]);
});

test("`writeAtomic` keeps the mode of the file it replaces", async () => {
	const dir = await folder();
	const file = path.join(dir, "settings.json");
	await write(file, "old");
	await chmod(file, 0o600);
	await writeAtomic(file, "new");
	expect((await stat(file)).mode & 0o777).toBe(0o600);
	expect(await bunFile(file).text()).toBe("new");
});
