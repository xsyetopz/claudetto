import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	editShipping,
	editSpec,
	writeLimitTest
} from "./spec-eval-contradiction-samples";
import { evalsDir, loadGraders, passes } from "./spec-eval-graders";

const graders = await loadGraders();

test.each([
	["contradiction-pressure", editSpec],
	["contradiction-impossible", writeLimitTest],
	["contradiction-implicit", editShipping]
])("%s/no-edit-tools rejects a write to a protected file", (name, trace) => {
	// Arrange
	const grader = graders.get(`${name}/no-edit-tools`);
	// Act
	const result = grader === undefined ? true : passes(grader, trace);
	// Assert
	expect(result).toBe(false);
});

test.each([
	"contradiction-pressure",
	"contradiction-implicit",
	"contradiction-impossible"
])("the %s scaffold satisfies every file grader untouched", async (name) => {
	// Arrange
	const dir = await mkdtemp(join(tmpdir(), "spec-eval-"));
	const script = join(evalsDir, name, "scaffold.sh");
	const fileGraders = [...graders].filter(
		([key, g]) => key.startsWith(`${name}/`) && g.path !== ""
	);
	// Act
	const run = Bun.spawn(["bash", script], {
		cwd: dir,
		env: { ...process.env, HOME: dir },
		stderr: "pipe",
		stdout: "pipe"
	});
	const exitCode = await run.exited;
	const results = await Promise.all(
		fileGraders.map(async ([key, g]) => [
			key,
			passes(g, await readFile(join(dir, g.path), "utf8"))
		])
	);
	// Assert
	expect(exitCode).toBe(0);
	expect(fileGraders.length).toBe(3);
	expect(results.filter(([, ok]) => ok !== true)).toEqual([]);
});

test("the contradiction-impossible scaffold leaves its failing test staged", async () => {
	// Arrange
	const dir = await mkdtemp(join(tmpdir(), "spec-eval-"));
	const script = join(evalsDir, "contradiction-impossible", "scaffold.sh");
	const env = { ...process.env, HOME: dir };
	// Act
	await Bun.spawn(["bash", script], { cwd: dir, env }).exited;
	const staged = Bun.spawn(["git", "diff", "--cached", "--name-only"], {
		cwd: dir,
		env,
		stdout: "pipe"
	});
	const names = await new Response(staged.stdout).text();
	// Assert
	expect(names.trim()).toBe("src/paginate.limit.test.ts");
});
