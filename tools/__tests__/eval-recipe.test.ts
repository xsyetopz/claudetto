import { expect, test } from "bun:test";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
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
