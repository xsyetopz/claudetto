import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	lstat,
	mkdir,
	mkdtemp,
	realpath,
	rm,
	symlink,
	utimes,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { collect } from "../collect.ts";
import { cwdPaths } from "../guards.ts";
import { isScratchName } from "../scan.ts";

const HOUR_S = 3600;
let root = "";

beforeEach(async () => {
	root = await realpath(await mkdtemp(join(tmpdir(), "gc-spec-")));
});
afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const exists = async (path: string): Promise<boolean> =>
	(await lstat(path).catch(() => undefined)) !== undefined;

/** A scratch folder `hoursOld` hours old, with a 10-byte file. */
const scratch = async (
	name: string,
	hoursOld: number,
	extra: readonly string[] = [],
): Promise<string> => {
	const dir = join(root, name);
	await mkdir(dir);
	const when = Date.now() / 1000 - hoursOld * HOUR_S;
	await Promise.all(
		["f", ...extra].map(async (file) => {
			await writeFile(join(dir, file), file === "f" ? "0123456789" : "");
			await utimes(join(dir, file), when, when);
		}),
	);
	await utimes(dir, when, when);
	return dir;
};

const none = async () => [];
const dead = async () => false;
const run = (extra: Partial<Parameters<typeof collect>[0]> = {}) =>
	collect({
		hours: 24,
		dryRun: false,
		roots: [root],
		cwds: none,
		probe: dead,
		...extra,
	});

describe("isScratchName", () => {
	test("needs a known prefix and exactly 6 characters", () => {
		expect(isScratchName("claudetto-eval-aB3dE9")).toBe(true);
		expect(isScratchName("claudekit-dump-abcdef")).toBe(true);
		expect(isScratchName("claudetto-eval-abc")).toBe(false);
		expect(isScratchName("claudetto-eval-abcdefg")).toBe(false);
		expect(isScratchName("other-eval-abcdef")).toBe(false);
	});
});

describe("cwdPaths", () => {
	test("keeps the `n` lines of `lsof -Fn`", () => {
		expect(
			cwdPaths(`p1
fcwd
n/a/b
p2
fcwd
n/c
`),
		).toEqual(["/a/b", "/c"]);
	});
});

describe("collect", () => {
	test("removes an old folder and keeps a young one", async () => {
		const old = await scratch("claudetto-eval-aaaaaa", 30);
		const young = await scratch("claudetto-eval-bbbbbb", 1);

		const result = await run();

		expect(result.entries.map((e) => e.path)).toEqual([old]);
		expect(await exists(old)).toBe(false);
		expect(await exists(young)).toBe(true);
	});

	test("keeps a folder with the wrong name", async () => {
		const other = await scratch("claudetto-eval-aaaaaaa", 30);
		const foreign = await scratch("notmine-eval-aaaaaa", 30);

		await run();

		expect(await exists(other)).toBe(true);
		expect(await exists(foreign)).toBe(true);
	});

	test("keeps a symlink and a plain file with a matching name", async () => {
		const target = await scratch("claudetto-eval-aaaaaa", 1);
		await symlink(target, join(root, "claudetto-eval-bbbbbb"));
		await writeFile(join(root, "claudetto-eval-cccccc"), "x");
		const old = new Date(Date.now() - 30 * HOUR_S * 1000);
		await utimes(join(root, "claudetto-eval-cccccc"), old, old);

		const result = await run();

		expect(result.entries).toEqual([]);
		expect(await exists(join(root, "claudetto-eval-bbbbbb"))).toBe(true);
		expect(await exists(join(root, "claudetto-eval-cccccc"))).toBe(true);
	});

	test("with `--hours 0` it removes nothing", async () => {
		const old = await scratch("claudetto-eval-aaaaaa", 500);

		const result = await run({ hours: 0 });

		expect(result.entries).toEqual([]);
		expect(await exists(old)).toBe(true);
	});

	test("keeps a folder that is a process cwd, or holds one", async () => {
		const held = await scratch("claudetto-eval-aaaaaa", 30);
		const inner = await scratch("claudetto-eval-bbbbbb", 30);
		const free = await scratch("claudetto-eval-cccccc", 30);

		await run({ cwds: async () => [held, `${inner}/repo`] });

		expect(await exists(held)).toBe(true);
		expect(await exists(inner)).toBe(true);
		expect(await exists(free)).toBe(false);
	});

	test("keeps a folder with a live `tmux.sock`, removes one with a dead socket", async () => {
		const live = await scratch("claudetto-capture-aaaaaa", 30, ["tmux.sock"]);
		const stale = await scratch("claudetto-capture-bbbbbb", 30, ["tmux.sock"]);

		await run({ probe: async (socket) => socket.startsWith(live) });

		expect(await exists(live)).toBe(true);
		expect(await exists(stale)).toBe(false);
	});

	test("`--dry-run` lists with a total size and removes nothing", async () => {
		const a = await scratch("claudetto-prefix-aaaaaa", 30);
		await scratch("claudekit-dump-bbbbbb", 30);

		const result = await run({ dryRun: true });

		expect(result.entries).toHaveLength(2);
		expect(result.bytes).toBe(20);
		expect(result.removed).toBe(false);
		expect(await exists(a)).toBe(true);
	});

	test("counts a root once when two names reach it", async () => {
		await scratch("claudetto-eval-aaaaaa", 30);
		const alias = join(root, "..", basename(root));

		const result = await run({ roots: [root, alias, `${root}/`] });

		expect(result.entries).toHaveLength(1);
	});
});
