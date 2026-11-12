import { afterEach, expect, test } from "bun:test";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { cleanCaches } from "../../plugins/claudetto/hygiene/mole.ts";
import { tempDir } from "../temp.mock.ts";

const PATH = process.env.PATH;
afterEach(() => {
	process.env.PATH = PATH;
});

/** A `mo` that records its arguments and whether stdin is a terminal, then exits `code`. */
const fakeMole = async (code: number) => {
	const dir = await tempDir("mole-");
	const log = join(dir, "log");
	await writeFile(
		join(dir, "mo"),
		`#!/bin/sh\n{ echo "$@"; [ -t 0 ] && echo tty || echo no-tty; } > '${log}'\nexit ${code}\n`,
	);
	await chmod(join(dir, "mo"), 0o755);
	process.env.PATH = `${dir}:/usr/bin:/bin`;
	return () => readFile(log, "utf8");
};

test("the sweep runs mo clean with no terminal on stdin and reports its exit", async () => {
	const log = await fakeMole(0);
	expect(await cleanCaches(false)).toBe("mo clean exited 0.");
	expect(await log()).toBe("clean\nno-tty\n");
});

test("a dry run previews mo clean and a failure reports its exit code", async () => {
	const log = await fakeMole(3);
	expect(await cleanCaches(true)).toBe("mo clean --dry-run exited 3.");
	expect(await log()).toBe("clean --dry-run\nno-tty\n");
});

test("a missing mo names its install command", async () => {
	process.env.PATH = await tempDir("no-mole-");
	expect(await cleanCaches(false)).toBe(
		"mo is not on PATH, so no cache was cleaned: install it with `brew install mole`.",
	);
});
