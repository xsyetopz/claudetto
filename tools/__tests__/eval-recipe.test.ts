import { expect, test } from "bun:test";
import {
	access,
	chmod,
	constants,
	mkdtemp,
	rm,
	writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const withJust = test.skipIf(Bun.which("just") === null);

/**
 * Runs `just --no-deps eval` (no paid run, no preflight) against a fake `claude` that records its
 * arguments, prints `out`, and exits `rc`.
 */
async function runEval(plugin: string, out: string, rc: number) {
	const bin = await mkdtemp(join(tmpdir(), "fake-claude-"));
	const fake = join(bin, "claude");
	await writeFile(
		fake,
		`#!/bin/sh\necho "ARGV: $*"\necho "${out}"\nexit ${rc}\n`
	);
	await chmod(fake, 0o755);
	const r = Bun.spawn(["just", "--no-deps", "eval", plugin], {
		cwd: root,
		env: { ...process.env, PATH: `${bin}:${process.env["PATH"] ?? ""}` },
		stderr: "pipe",
		stdout: "pipe"
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(r.stdout).text(),
		new Response(r.stderr).text(),
		r.exited
	]);
	return { exitCode, stderr, stdout };
}

withJust(
	"grants every gated tool a case lists, mcp__ tools included, before any other flag",
	async () => {
		// Act
		const r = await runEval("claudetto", "ok", 0);

		// Assert
		expect(r.exitCode).toBe(0);
		expect(r.stdout).toContain(
			"--allow-tools Bash Edit Write mcp__claudetto__patch --scaffold"
		);
		expect(r.stdout).not.toContain("--allow-tools Read");
	}
);

withJust("a run that prints 'not granted' fails the recipe", async () => {
	// Act
	const r = await runEval("claudetto", "not granted (missing grant): Bash", 0);

	// Assert
	expect(r.exitCode).toBe(1);
	expect(r.stdout).toContain("not granted");
	expect(r.stderr).toContain("FAILED");
});

withJust("the eval's own nonzero exit status survives the pipe", async () => {
	// Act
	const r = await runEval("claudetto", "ok", 3);

	// Assert
	expect(r.exitCode).toBe(3);
});

const caseDir = join(root, "plugins", "claudetto", "evals", "trivial-typo");
// A sandboxed Claude Code session that loads claudetto from this tree write-denies the
// plugin folder, so the probe file cannot be planted there (RISK-541).
const caseDirWritable = await access(caseDir, constants.W_OK).then(
	() => true,
	() => false
);

test.skipIf(Bun.which("just") === null || !caseDirWritable)(
	"an uncommitted case file stops the run before claude starts (CON-056)",
	async () => {
		// Arrange
		const probe = join(caseDir, `uncommitted-${process.pid}.txt`);
		await writeFile(probe, "x\n");

		// Act
		const r = await runEval("claudetto", "ok", 0).finally(() =>
			rm(probe, { force: true })
		);

		// Assert
		expect(r.exitCode).toBe(1);
		expect(r.stderr).toContain("CON-056");
		expect(r.stdout).not.toContain("ARGV");
	}
);

withJust("each case's commit is printed before the run (CON-055)", async () => {
	// Act
	const r = await runEval("claudetto", "ok", 0);

	// Assert
	expect(r.stderr).toMatch(/^case commit: trivial-typo [0-9a-f]{7,}$/mu);
});
