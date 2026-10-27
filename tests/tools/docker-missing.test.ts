// The fault test of `just docker` with no `docker` CLI (task 2.1 of change `0-3-0`, spec `release-evidence` "Docker Down").
// Fault 34 of `.claude/claudetto/0.3.0-findings.md`: the recipe exited `1` with no output. The test failed on `v0.2.0`, and `checkImage` of `dev/docker/image.ts` now names the missing CLI.

import { expect, test } from "bun:test";
import { chmod, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { REPO } from "../support/repo.ts";
import { spawnText } from "./fixture-repo.ts";

const RUN_RE = /^run /m;
const OPEN_A_ORBSTACK_RE = /open -a OrbStack|orb start/;

test("fault 34: `dev/docker.ts` names the missing `docker` CLI and the command that starts it", async () => {
	const run = await spawnText(process.execPath, ["dev/docker.ts", "check"], {
		cwd: REPO,
		env: { PATH: path.dirname(process.execPath), HOME: process.env["HOME"] },
	});
	const text = `${run.stdout}${run.stderr}`;
	expect(run.status).not.toBe(0);
	expect(text).toContain("docker");
	expect(text).toMatch(OPEN_A_ORBSTACK_RE);
});

test("`dev/docker.ts` gives `docker build` a version for each build value of the image", async () => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "docker-stub-"));
	const log = path.join(dir, "log");
	await bunWrite(path.join(dir, "docker"), `#!/bin/sh\necho "$@" >> ${log}\n`);
	await chmod(path.join(dir, "docker"), 0o755);
	const run = await spawnText(process.execPath, ["dev/docker.ts", "check"], {
		cwd: REPO,
		env: {
			PATH: `${dir}:${path.dirname(process.execPath)}`,
			HOME: process.env["HOME"],
		},
	});
	const calls = await bunFile(log)
		.text()
		.catch(() => "");
	await rm(dir, { recursive: true });
	expect(`${run.stderr}`).toBe("");
	for (const arg of ["BUN_VERSION", "JUST_VERSION", "CLAUDE_CODE_VERSION"]) {
		expect(calls).toMatch(
			new RegExp(`^build .*${arg}=\\d+\\.\\d+\\.\\d+`, "m"),
		);
	}
	expect(calls).toMatch(RUN_RE);
});
