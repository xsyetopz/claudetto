import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "check-register.ts");

/** Writes one register file and one OUT file into a fresh directory and runs the check on them. */
function run(register: string, outs = "") {
	const root = mkdtempSync(join(tmpdir(), "register-"));
	const dir = join(root, "risk-register");
	mkdirSync(dir);
	writeFileSync(join(dir, "block.md"), register);
	writeFileSync(join(root, "outs.md"), outs);
	const r = Bun.spawnSync(["bun", script, dir, join(root, "outs.md")], { stdout: "pipe", stderr: "pipe" });
	return { code: r.exitCode, out: r.stdout.toString() };
}

const item = (id: string, level: number, status: string, verified = "") =>
	`- [x] **${id}** A fault.\n  - Likelihood: ${level}\n  - Impact: 2\n  - Status: ${status}\n${verified}`;

test("a settled item with a Verified line passes", () => {
	// Act
	const r = run(item("RISK-1", 4, "closed 2026-11-19.", "  - Verified: 2026-11-19, bun test x -> 3 pass.\n"));

	// Assert
	expect(r.code).toBe(0);
});

test("a Verified clause on the Status line counts as the check", () => {
	// Act
	const r = run(item("RISK-1", 3, "mitigated 2026-11-19. Verified: plugin test twice, 129 pass."));

	// Assert
	expect(r.code).toBe(0);
});

test("a closed item with no Verified line is listed", () => {
	// Act
	const r = run(item("RISK-1", 1, "closed 2026-11-19; the part is out."));

	// Assert
	expect(r.code).toBe(1);
	expect(r.out).toContain("settled with no Verified line: 1");
	expect(r.out).toContain("RISK-1 (block.md)");
});

test("an open item at Likelihood 3 is listed and one at Likelihood 2 is not", () => {
	// Act
	const high = run(item("RISK-1", 3, "open."));
	const low = run(item("RISK-1", 2, "open."));

	// Assert
	expect(high.code).toBe(1);
	expect(low.code).toBe(0);
});

test("a transferred item with a Verified line counts as settled", () => {
	// Act
	const r = run(item("RISK-1", 4, "transferred 2026-11-19 (#99).", "  - Verified: engine site chunk.js:10.\n"));

	// Assert
	expect(r.code).toBe(0);
});

test("a stub moved Out as a not-shipped part passes and one moved Out for want of a paid run is listed", () => {
	// Arrange
	const register = "- [x] **RISK-1** Moved Out as OUT-1.\n- [x] **RISK-2** Moved Out as OUT-2.\n";
	const outs = [
		"- [x] **OUT-1** Out (the item describes a part that plugins/ does not ship; moved from RISK-1): x.",
		"- [x] **OUT-2** Out (needs a paid model run or a benchmark; moved from RISK-2): y.",
	].join("\n");

	// Act
	const r = run(register, outs);

	// Assert
	expect(r.code).toBe(1);
	expect(r.out).toContain("other than a part plugins/ does not ship: 1");
	expect(r.out).toContain("RISK-2 (block.md): OUT-2 needs a paid model run");
	expect(r.out).not.toContain("RISK-1 (block.md)");
});

test("a stub whose OUT entry is missing is listed", () => {
	// Act
	const r = run("- [x] **RISK-1** Moved Out as OUT-9.\n");

	// Assert
	expect(r.out).toContain("RISK-1 (block.md): OUT-9 no OUT entry");
});
