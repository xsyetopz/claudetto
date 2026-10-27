// The skill `dedupe` runs `jscpd` with the shipped config and the baseline flags of its text (task 9.3 of change `release-0-3-0-alpha-2`, design D16).

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file, spawn, write } from "bun";

const SKILL_DIR = path.resolve("plugins/claudetto/skills/dedupe");
const JSCPD = path.resolve("node_modules/.bin/jscpd");
const SKILL = await file(path.join(SKILL_DIR, "SKILL.md")).text();

/** The flags in backticks of the baseline line of the skill. */
const flags = (prefix: string): string[] =>
	(SKILL.match(new RegExp(`\`(${prefix}[^\`]*)\``))?.[1] ?? "").split(" ");

/** Twelve lines of TypeScript that `jscpd` reports as a clone when two files hold them. */
const code = (name: string): string =>
	Array.from(
		{ length: 12 },
		(_, i) =>
			`export const ${name}${i} = (a: number, b: number): number => { const c = a * ${i} + b; return c - ${i} * a + b * b; };`,
	).join("\n");

const jscpd = async (dir: string, args: string[]) => {
	const config = ["-c", path.join(SKILL_DIR, "jscpd.json")];
	const run = spawn([JSCPD, ...config, "--no-tips", ...args, "src"], {
		cwd: dir,
		stdout: "pipe",
		stderr: "ignore",
	});
	const out = await new Response(run.stdout).text();
	return { status: await run.exited, out };
};

test("the shipped config reports a clone, and with the baseline flags of the skill only a new clone fails the run", async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "dedupe-"));
	await write(path.join(dir, "src/a.ts"), code("f"));
	await write(path.join(dir, "src/b.ts"), code("f"));
	expect((await jscpd(dir, [])).out).toContain("Found 1 clones.");
	const baseline = flags("--baseline ");
	expect(baseline.at(-1)).toBe("0");
	const update = await jscpd(dir, [
		...baseline.slice(0, 2),
		"--update-baseline",
	]);
	expect(update.status).toBe(0);
	expect((await jscpd(dir, baseline)).status).toBe(0);
	await write(path.join(dir, "src/c.ts"), code("g"));
	await write(path.join(dir, "src/d.ts"), code("g"));
	expect((await jscpd(dir, baseline)).status).toBe(1);
});
