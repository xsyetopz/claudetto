import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "check-catch.sh");
const plugin = join(import.meta.dir, "..", "..", "plugins", "claudetto");
/** `claude plugin validate` takes about 10 s on 2.1.330 (measured 2026-11-21), past bun's 5 s default. */
const VALIDATE_MS = 60_000;
const bin = process.env["CLAUDE_BIN"] ?? "claude";
const env = { ...process.env, CLAUDE_BIN: bin };
/**
 * The check runs Claude Code's own validator, so it needs the binary; CI runs no Claude Code
 * (the maintainer's decision on issue #88), and `just verify` runs these tests locally.
 */
const withClaude = test.skipIf(Bun.which(bin) === null);

async function check(dir: string) {
	const r = Bun.spawn(["sh", script, dir], {
		env,
		stderr: "pipe",
		stdout: "pipe"
	});
	const [stderr, exitCode] = await Promise.all([
		new Response(r.stderr).text(),
		r.exited
	]);
	return { exitCode, stderr };
}

withClaude(
	"a gating hook without .catch fails the check and is named",
	async () => {
		// Arrange
		const copy = await mkdtemp(join(tmpdir(), "catch-"));
		await cp(plugin, copy, { recursive: true });
		const spawn = join(copy, "hooks", "delegation", "spawn.ts");
		const source = await readFile(spawn, "utf8");
		await writeFile(
			spawn,
			source.replace(/\}\)\.catch\([\s\S]*?\n\t\}\);/u, "});")
		);

		// Act
		const r = await check(copy);

		// Assert
		expect(r.exitCode).toBe(1);
		expect(r.stderr).toContain("agent.spawn");
	},
	VALIDATE_MS
);

withClaude(
	"the shipped plugin passes the check",
	async () => {
		// Arrange
		const dir = plugin;

		// Act
		const r = await check(dir);

		// Assert
		expect(r.exitCode).toBe(0);
	},
	VALIDATE_MS
);
