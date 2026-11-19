import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "check-catch.sh");
const plugin = join(import.meta.dir, "..", "plugins", "claudetto");
const env = { ...process.env, CLAUDE_BIN: process.env.CLAUDE_BIN ?? "claude" };

function check(dir: string) {
	return Bun.spawnSync(["sh", script, dir], { env, stderr: "pipe", stdout: "pipe" });
}

test("a gating hook without .catch fails the check and is named", () => {
	// Arrange
	const copy = mkdtempSync(join(tmpdir(), "catch-"));
	cpSync(plugin, copy, { recursive: true });
	const spawn = join(copy, "hooks", "delegation", "spawn.ts");
	writeFileSync(spawn, readFileSync(spawn, "utf8").replace(/\}\)\.catch\(.*$/mu, "});"));

	// Act
	const r = check(copy);

	// Assert
	expect(r.exitCode).toBe(1);
	expect(r.stderr.toString()).toContain("agent.spawn");
});

test("the shipped plugin passes the check", () => {
	expect(check(plugin).exitCode).toBe(0);
});
