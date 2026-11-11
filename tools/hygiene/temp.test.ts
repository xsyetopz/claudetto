import { expect, test } from "bun:test";
import { chmod, exists, mkdir, utimes, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logged, NOW, repo, swept, sweptWhileOpen, UID } from "./trash.mock.ts";

/** A folder of Claude Code's temp folder that holds one file, both `minutes` old. */
const tempEntry = async (root: string, name: string, minutes = 120) => {
	const dir = join(root, "tmp", `claude-${UID}`, name);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "a"), "x");
	const at = new Date(NOW - minutes * 60_000);
	await Promise.all([join(dir, "a"), dir].map((p) => utimes(p, at, at)));
	return dir;
};

// Seen on the author's machine: 9,666 entries sat in the temp folder, none of them with a marker file.
test("an idle temp folder and file go, and a folder with a file changed 10 minutes ago stays", async () => {
	const { root, proj } = await repo();
	const idleDir = await tempEntry(root, "cos-fx-1");
	const busy = await tempEntry(root, "cos-fx-2");
	const recent = new Date(NOW - 10 * 60_000);
	await utimes(join(busy, "a"), recent, recent);
	const file = join(root, "tmp", `claude-${UID}`, "el.log");
	await writeFile(file, "x");
	const old = new Date(NOW - 120 * 60_000);
	await utimes(file, old, old);

	expect(await swept(root, proj, ["--probe-minutes", "0"])).toEqual([]);
	const found = await swept(root, proj);

	expect(found).toHaveLength(2);
	expect(found).toContainEqual(["idle-temp", idleDir]);
	expect(found).toContainEqual(["idle-temp", file]);
});

test("a temp folder stays while a process holds a file in it open", async () => {
	const { root, proj } = await repo();
	const dir = await tempEntry(root, "cos-fx-1");

	expect(await sweptWhileOpen(root, proj, join(dir, "a"))).toEqual([]);
});

// Go's module cache and some test suites leave read-only folders, which `rm` cannot empty.
test("a temp folder that cannot be removed is logged and left out of the report, and the others go", async () => {
	const { root, proj } = await repo();
	const stuck = await tempEntry(root, "gomod-1");
	const gone = await tempEntry(root, "cos-fx-1");
	await chmod(stuck, 0o555);

	const found = await swept(root, proj);
	await chmod(stuck, 0o755);

	expect(found).toEqual([["idle-temp", gone]]);
	expect(logged.join("\n")).toContain(`${stuck} was not removed`);
	expect(await exists(gone)).toBe(false);
});

// Seen in a dry run: `cc-socks` and a nested `claude-501`, which a session started inside the temp folder makes, were named for removal.
test("the temp entries Claude Code owns stay", async () => {
	const { root, proj } = await repo();
	await Promise.all(
		[
			"-Users-me-project",
			"bash-edit-diff",
			"plugin-tool-staging",
			"cc-socks",
			"cc-socks-501",
			"cc-daemon-501",
			"claude-501",
		].map((name) => tempEntry(root, name)),
	);

	expect(await swept(root, proj)).toEqual([]);
});
