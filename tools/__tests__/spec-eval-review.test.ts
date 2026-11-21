import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { evalsDir } from "./spec-eval-graders";

test("the spec-review-hollow-test scaffold leaves an uncommitted diff whose tests pass", async () => {
	// Arrange
	const dir = await mkdtemp(join(tmpdir(), "spec-eval-"));
	const script = join(evalsDir, "spec-review-hollow-test", "scaffold.sh");
	const env = { ...process.env, HOME: dir };
	// Act
	const scaffold = Bun.spawn(["bash", script], {
		cwd: dir,
		env,
		stderr: "pipe",
		stdout: "pipe"
	});
	const scaffolded = await scaffold.exited;
	const diff = Bun.spawn(["git", "diff", "--name-only"], {
		cwd: dir,
		env,
		stdout: "pipe"
	});
	const changed = await new Response(diff.stdout).text();
	const tests = Bun.spawn(["bun", "test"], {
		cwd: dir,
		env,
		stderr: "pipe",
		stdout: "pipe"
	});
	const testsExit = await tests.exited;
	// Assert
	expect(scaffolded).toBe(0);
	expect(changed.split("\n").toSorted()).toEqual([
		"",
		"specs/stock.md",
		"src/stock.test.ts",
		"src/stock.ts"
	]);
	expect(testsExit).toBe(0);
});
