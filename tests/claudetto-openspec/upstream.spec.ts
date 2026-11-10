// Upstream's `openspec validate --strict` must pass on what the plugin's code wrote (bun test only: the lab has no node APIs).
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawn } from "bun";

import { openspec } from "../../plugins/claudetto-openspec/hooks/openspec.ts";
import { nodeFs } from "./fixture-kit.ts";

const BIN = `${import.meta.dir}/../../node_modules/.bin/openspec`;
const upstream = async (cwd: string, ...args: string[]) => {
	const p = spawn(["bun", "--bun", BIN, "validate", ...args, "--strict"], {
		cwd,
		stderr: "pipe",
		stdout: "pipe",
	});
	const [out, exitCode] = [await new Response(p.stdout).text(), await p.exited];
	return { exitCode, out };
};
const put = async (root: string, rel: string, text: string) => {
	await mkdir(join(root, rel, ".."), { recursive: true });
	await writeFile(join(root, rel), text);
};

test("upstream validate --strict passes on a change the plugin validated and archived", async () => {
	const root = await mkdtemp(join(tmpdir(), "cos-up-"));
	const c = "openspec/changes/add-thing";
	await put(root, `${c}/.openspec.yaml`, "schema: spec-driven\n");
	await put(
		root,
		`${c}/proposal.md`,
		"## Why\nA reason.\n\n## What Changes\n- A thing.\n",
	);
	await put(root, `${c}/tasks.md`, "- [x] 1.1 done\n");
	await put(
		root,
		`${c}/specs/thing/spec.md`,
		"## Purpose\nDo the thing for the people who ask for it, so it gets done.\n\n## ADDED Requirements\n\n### Requirement: Thing\nThe system SHALL do the thing.\n\n#### Scenario: Doing\n- **WHEN** asked\n- **THEN** it is done\n",
	);
	const deps = {
		fs: nodeFs,
		root,
		date: "2026-11-06",
		run: async (argv: string[]) => {
			const p = spawn(argv, { stderr: "pipe" });
			return {
				exitCode: await p.exited,
				stderr: await new Response(p.stderr).text(),
			};
		},
	};
	expect(
		await openspec(deps, { action: "validate", change: "add-thing" }),
	).toBe("add-thing: valid");
	const before = await upstream(root, "add-thing");
	expect(before.out).toContain("valid");
	expect(before.exitCode).toBe(0);
	expect(
		await openspec(deps, { action: "archive", change: "add-thing" }),
	).toContain("Archived");
	const after = await upstream(root, "--specs");
	expect(after.exitCode).toBe(0);
});
