// `claudetto-setup --mode merge|replace` and `--keep` (task 3.4 of change `release-0-3-0-alpha-2`, spec `setup`, "Merge Keeps User Keys" and "Merge or Replace").

import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write } from "bun";
import { runMain } from "../../support/setup-run.ts";

const KEY = "cc-plugin-you-should-know@builtin";

/** Runs setup with `args` and `--apply` in a new folder whose `settings.json` is `settings`, or missing for `undefined`. */
const run = async (args: string[], settings?: object) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "setup-mode-"));
	const file = path.join(dir, "settings.json");
	if (settings) {
		await write(file, JSON.stringify(settings));
	}
	const { status, text } = await runMain(dir, [...args, "--apply"]);
	if (status !== 0) {
		throw new Error(`setup exited with ${status}: ${text}`);
	}
	return { dir, text, after: await bunFile(file).json() };
};

const USER = { enabledPlugins: { [KEY]: true }, myKey: 1 };

test("Conflicting Value: `merge` writes the snippet value, and `--keep` holds the value of the user", async () => {
	const snippet = await run(["--mode", "merge"], USER);
	expect(snippet.after.enabledPlugins[KEY]).toBe(false);
	const kept = await run(["--keep", `enabledPlugins.${KEY}`], USER);
	expect(kept.after.enabledPlugins[KEY]).toBe(true);
	expect(kept.after.myKey).toBe(1);
});

test("Replace: the settings file equals the snippet, and a backup file next to it holds the old content", async () => {
	const fresh = await run(["--mode", "replace"]);
	const { dir, text, after } = await run(["--mode", "replace"], USER);
	expect(after).toStrictEqual(fresh.after);
	const backups = (await readdir(dir)).filter((f) => f.endsWith(".bak"));
	expect(backups.length).toBe(1);
	const backup = path.join(dir, backups[0] ?? "");
	expect(await bunFile(backup).json()).toStrictEqual(USER);
	expect(text).toContain(backup);
});

test("an unknown mode exits with code 2", async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "setup-mode-"));
	const { status } = await runMain(dir, ["--mode", "swap"]);
	expect(status).toBe(2);
});
