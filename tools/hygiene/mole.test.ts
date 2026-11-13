import { afterEach, expect, test } from "bun:test";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { cleanCaches } from "../../plugins/claudetto/hygiene/mole.ts";
import { tempDir } from "../temp.mock.ts";

const PATH = process.env.PATH;
afterEach(() => {
	process.env.PATH = PATH;
});

const DAY_MS = 86_400_000;

/** A `mo` that waits `seconds`, records its arguments and whether stdin is a terminal, then exits `code`. */
const fakeMole = async (code: number, seconds = 0) => {
	const dir = await tempDir("mole-");
	const log = join(dir, "log");
	await writeFile(
		join(dir, "mo"),
		`#!/bin/sh\nsleep ${seconds}\n{ echo "$@"; [ -t 0 ] && echo tty || echo no-tty; } > '${log}'\nexit ${code}\n`,
	);
	await chmod(join(dir, "mo"), 0o755);
	process.env.PATH = `${dir}:/usr/bin:/bin`;
	return { stamp: join(dir, "stamp"), log: () => readFile(log, "utf8") };
};

const settle = () => Bun.sleep(300);

test("the sweep starts mo clean with no terminal on stdin and does not wait for it", async () => {
	const mole = await fakeMole(0, 1);
	const started = Date.now();

	expect(await cleanCaches(false, mole.stamp, started)).toBe(
		"mo clean started.",
	);
	expect(Date.now() - started).toBeLessThan(900);
	await Bun.sleep(1300);
	expect(await mole.log()).toBe("clean\nno-tty\n");
});

test("a second sweep within a day starts no mo clean, and one a day later does", async () => {
	const mole = await fakeMole(0);
	const now = Date.now();
	await cleanCaches(false, mole.stamp, now);
	await settle();
	await writeFile(join(mole.stamp, "..", "log"), "");

	expect(await cleanCaches(false, mole.stamp, now + DAY_MS - 1)).toBe(
		"mo clean ran in the last day, so it did not start.",
	);
	await settle();
	expect(await mole.log()).toBe("");
	expect(await cleanCaches(false, mole.stamp, now + DAY_MS)).toBe(
		"mo clean started.",
	);
});

test("a dry run previews mo clean, waits for it, and reports its exit code", async () => {
	const mole = await fakeMole(3);
	expect(await cleanCaches(true, mole.stamp, Date.now())).toBe(
		"mo clean --dry-run exited 3.",
	);
	expect(await mole.log()).toBe("clean --dry-run\nno-tty\n");
});

test("a missing mo names its install command", async () => {
	process.env.PATH = await tempDir("no-mole-");
	expect(await cleanCaches(false, join(process.env.PATH, "stamp"), 0)).toBe(
		"mo is not on PATH, so no cache was cleaned: install it with `brew install mole`.",
	);
});
