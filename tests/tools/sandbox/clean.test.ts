// Behavior of `claudetto-sandbox --clean`: it removes only the sandbox layout, and it refuses any other folder.
// `just sandbox-install` runs it first, so it also passes on a missing folder.
// Every test uses a folder under the temp folder, never the real home or the working folder.

import { afterEach, beforeEach, expect, test } from "bun:test";
import {
	chmod,
	lstat,
	mkdir,
	mkdtemp,
	rm,
	stat,
	symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { main } from "../../../dev/sandbox/adapters/cli.ts";
import { setUp } from "../../../dev/sandbox/adapters/setup.ts";
import { cleanRefusal } from "../../../dev/sandbox/domain/clean.ts";
import { pathExists } from "../helpers.ts";

let scratch = "";
beforeEach(async () => {
	scratch = await mkdtemp(path.join(os.tmpdir(), "clean-test-"));
});
afterEach(async () => {
	await rm(scratch, { recursive: true, force: true });
});

test("`--clean` refuses a folder that holds a file outside the sandbox layout", async () => {
	const root = path.join(scratch, "work");
	await mkdir(path.join(root, "config"), { recursive: true });
	await bunWrite(path.join(root, "notes.txt"), "keep me");

	const code = await main(["--dir", root, "--clean"]);

	expect(code).not.toBe(0);
	expect(await bunFile(path.join(root, "notes.txt")).text()).toBe("keep me");
});

test("`--clean` refuses a folder that holds a sub-folder outside the layout", async () => {
	const root = path.join(scratch, "work");
	await mkdir(path.join(root, "src"), { recursive: true });

	const code = await main(["--dir", root, "--clean"]);

	expect(code).not.toBe(0);
	expect(await pathExists(path.join(root, "src"))).toBe(true);
});

test("`--clean` refuses a folder that holds only `config/` and `project/` and no marker", async () => {
	const root = path.join(scratch, "work");
	await mkdir(path.join(root, "config"), { recursive: true });
	await mkdir(path.join(root, "project"), { recursive: true });

	const code = await main(["--dir", root, "--clean"]);

	expect(code).not.toBe(0);
	expect(await pathExists(path.join(root, "config"))).toBe(true);
	expect(await pathExists(path.join(root, "project"))).toBe(true);
});

test("`--clean` of a missing folder exits 0 and makes no folder", async () => {
	const root = path.join(scratch, "missing");

	const code = await main(["--dir", root, "--clean"]);

	expect(code).toBe(0);
	expect(await pathExists(root)).toBe(false);
});

test("`--clean` refuses an empty folder that is not the default", async () => {
	const root = path.join(scratch, "mount");
	await mkdir(root);

	const code = await main(["--dir", root, "--clean"]);

	expect(code).not.toBe(0);
	expect(await pathExists(root)).toBe(true);
});

test("`--clean` removes a folder that the setup made", async () => {
	const root = path.join(scratch, "sandbox");
	await setUp({
		root,
		config: path.join(root, "config"),
		home: path.join(root, "home"),
		project: path.join(root, "project"),
	});

	const code = await main(["--dir", root, "--clean"]);

	expect(code).toBe(0);
	expect(await pathExists(root)).toBe(false);
});

test("`--dir` followed by a flag exits 1 and does not take the flag as the folder", async () => {
	const code = await main(["--dir", "--clean"]);

	expect(code).toBe(1);
});

test("`cleanRefusal` allows the default folder whatever it holds", () => {
	expect(
		cleanRefusal("/tmp/claudetto-sandbox", ["notes.txt"], true),
	).toBeNull();
});

test("`cleanRefusal` allows a folder that holds the layout and the marker, and names the foreign entries", () => {
	expect(
		cleanRefusal("/x", ["config", "home", ".claudetto-sandbox"], false),
	).toBeNull();
	expect(cleanRefusal("/x", ["config", "README.md"], false)).toContain(
		"README.md",
	);
});

test("`cleanRefusal` refuses a folder without the marker, even when it holds only the layout", () => {
	expect(cleanRefusal("/x", ["config", "home"], false)).not.toBeNull();
	expect(cleanRefusal("/x", [], false)).not.toBeNull();
});

test("`--clean` removes a sandbox whose `config/` folder is read-only and holds a file", async () => {
	const root = path.join(scratch, "sandbox");
	const config = path.join(root, "config");
	await mkdir(config, { recursive: true });
	await bunWrite(path.join(root, ".claudetto-sandbox"), "");
	await bunWrite(path.join(config, "state.json"), "{}");
	await chmod(config, 0o555);
	try {
		const code = await main(["--dir", root, "--clean"]);
		expect(code).toBe(0);
		expect(await pathExists(root)).toBe(false);
	} finally {
		if (await pathExists(config)) {
			await chmod(config, 0o755);
		}
	}
});

test("`--clean` refuses a symlinked root and leaves the folder that the link points to", async () => {
	const outside = path.join(scratch, "outside");
	await mkdir(path.join(outside, "config"), { recursive: true });
	await mkdir(path.join(outside, "project"), { recursive: true });
	await bunWrite(path.join(outside, ".claudetto-sandbox"), "");
	await chmod(path.join(outside, "config"), 0o555);
	await chmod(outside, 0o555);
	// The test compares with the mode that `chmod` gave.
	const modeOf = async (dir: string): Promise<number> =>
		(await stat(dir)).mode & 0o777;
	const before = [
		await modeOf(outside),
		await modeOf(path.join(outside, "config")),
	];
	const link = path.join(scratch, "link");
	await symlink(outside, link);

	try {
		const code = await main(["--dir", link, "--clean"]);

		expect(code).not.toBe(0);
		expect((await lstat(link)).isSymbolicLink()).toBe(true);
		expect([
			await modeOf(outside),
			await modeOf(path.join(outside, "config")),
		]).toEqual(before);
	} finally {
		await chmod(path.join(outside, "config"), 0o755);
		await chmod(outside, 0o755);
	}
});

test("`--clean` on a missing folder exits 0, and a second `--clean` does too", async () => {
	const dir = path.join(scratch, "sandbox");

	expect(await main(["--dir", dir, "--clean"])).toBe(0);
	expect(await main(["--dir", dir, "--clean"])).toBe(0);
	expect(await pathExists(dir)).toBe(false);
});

test("`--clean` removes a sandbox folder that holds a read-only file", async () => {
	const dir = path.join(scratch, "sandbox");
	await mkdir(path.join(dir, "config"), { recursive: true });
	await bunWrite(path.join(dir, ".claudetto-sandbox"), "");
	const locked = path.join(dir, "config", "settings.json");
	await bunWrite(locked, "{}");
	await chmod(locked, 0o444);

	expect(await main(["--dir", dir, "--clean"])).toBe(0);
	expect(await pathExists(dir)).toBe(false);
});
