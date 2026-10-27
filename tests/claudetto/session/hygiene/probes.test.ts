// The workaround for anthropics/claude-code#104170 (spec `session-hygiene`, "Leaked Probe Folders").
// The test runs the real `find` of `sweepArgv` on a fake temp folder, so it checks the flags on this system.

import { afterAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "bun";
import {
	removedCount,
	sweepArgv,
} from "../../../../plugins/claudetto/modules/session/hygiene/domain/probes.ts";
import { PROBE_MAX_AGE_MIN } from "../../../../plugins/claudetto/modules/session/hygiene/limits.ts";

const base = await mkdtemp(path.join(tmpdir(), "hygiene-"));
afterAll(() => rm(base, { recursive: true, force: true }));

/** Runs the sweep `argv`, and waits for its exit and its output. */
const sweep = async (argv: string[]) => {
	const proc = spawn(argv, { stdout: "pipe", stderr: "ignore" });
	const stdout = await new Response(proc.stdout).text();
	return { exitCode: await proc.exited, stdout };
};

test("Old Probe, Running Probe, and Unknown Folder: only a probe folder over the age goes", async () => {
	const root = path.join(base, `claude-${process.getuid?.() ?? 0}`);
	const old = (Date.now() - (PROBE_MAX_AGE_MIN + 60) * 60_000) / 1000;
	await Promise.all(
		[
			"fswatch-probe-old1",
			"fswatch-probe-old2",
			"fswatch-probe-new",
			"tscheck",
		].map(async (name) => {
			await mkdir(path.join(root, name, "x"), { recursive: true });
			if (name !== "fswatch-probe-new") {
				await utimes(path.join(root, name), old, old);
			}
		}),
	);
	const run = await sweep(sweepArgv(`${base}/`));
	expect(run.exitCode).toBe(0);
	expect(removedCount(run.stdout)).toBe(2);
	expect((await readdir(root)).sort()).toStrictEqual([
		"fswatch-probe-new",
		"tscheck",
	]);
});

test("a temp folder of Claude Code that does not exist removes nothing", async () => {
	const run = await sweep(sweepArgv(path.join(base, "none")));
	expect(removedCount(run.stdout)).toBe(0);
});
