// The toolkit reaches the plugin through one file. A second file naming a `plugins/` path is a coupling
// that drifts, so the boundary is held here.

import { expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

const ROOT = join(import.meta.dir, "..", "..");
const KIT = join(ROOT, "claudekit");

/** The seam itself, the only file under `claudekit/` allowed to name a `plugins/` path. */
const SEAM = "claudekit/plugin.ts";

/** A `plugins/` path, but not the `.claude/plugins/` folder of the user's home that the price tool reads. */
const PLUGIN_PATH = /(?<!\.claude\/)plugins\//;

test("no toolkit file but the seam names a plugins/ path", async () => {
	// Arrange
	const files = [...new Glob("**/*.ts").scanSync({ cwd: KIT })]
		.map((name) => join("claudekit", name))
		.filter((name) => name !== SEAM);

	// Act
	const texts = await Promise.all(
		files.map((name) => bunFile(join(ROOT, name)).text()),
	);
	const naming = files.filter((_, at) => PLUGIN_PATH.test(texts[at] ?? ""));

	// Assert
	expect(files.length).toBeGreaterThan(0);
	expect(naming).toEqual([]);
});

test("the seam is the file that names the plugin", async () => {
	// Arrange
	const text = await bunFile(join(ROOT, SEAM)).text();

	// Act
	const names = PLUGIN_PATH.test(text);

	// Assert
	expect(names).toBe(true);
});
