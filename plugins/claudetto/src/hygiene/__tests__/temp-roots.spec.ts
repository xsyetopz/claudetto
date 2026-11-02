import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tempBases, tempRoots } from "../temp-roots.ts";

const UID = process.getuid?.() ?? 0;

let home = "";

beforeEach(async () => {
	home = await realpath(await mkdtemp(join(tmpdir(), "hygiene-")));
});

afterEach(async () => {
	await rm(home, { recursive: true, force: true });
});

test("the bases are `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder", () => {
	expect(tempBases({ CLAUDE_CODE_TMPDIR: "/t" })).toEqual([
		"/t",
		"/tmp",
		tmpdir(),
	]);
	expect(tempBases({})).toEqual(["/tmp", tmpdir()]);
});

test("a base holding `claude-<uid>` gives that folder, and a base without one gives none", async () => {
	await mkdir(join(home, "a", `claude-${UID}`), { recursive: true });
	await mkdir(join(home, "b"), { recursive: true });

	expect(await tempRoots([join(home, "a"), join(home, "b")], UID)).toEqual([
		join(home, "a", `claude-${UID}`),
	]);
});

test("two candidates that resolve to the same folder give it once", async () => {
	await mkdir(join(home, "a", `claude-${UID}`), { recursive: true });
	await symlink(join(home, "a"), join(home, "alias"));

	expect(
		await tempRoots(
			[join(home, "a"), join(home, "alias"), join(home, "a")],
			UID,
		),
	).toEqual([join(home, "a", `claude-${UID}`)]);
});

test("a folder of another uid is not a root", async () => {
	await mkdir(join(home, "a", `claude-${UID + 1}`), { recursive: true });

	expect(await tempRoots([join(home, "a")], UID + 1)).toEqual([]);
});
