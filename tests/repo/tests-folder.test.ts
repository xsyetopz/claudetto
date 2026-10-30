// A test that sits in a `__tests__/` folder beside its source is a test and not a shipped source, so
// the tools that read shipped code must skip it and the tools that limit file length must give it the
// test limit. Without this, moving a test next to its source makes `rebuild/silent` scan it for
// telemetry nouns and network calls and makes `file-lines` hold a helper to the source limit.
//
// The second group guards the suffix instead of the folder. `claude plugin test` matches `*.test.ts`
// and `*.test.tsx` only and reaches every folder under a plugin, with no flag to ignore one, so the
// `.spec.ts` suffix is the only thing that keeps a plugin-side unit test out of the lab runner. A new
// file landing as `__tests__/foo.test.ts` would be collected by both runners and would move the lab
// count with nothing else failing, which is why the glob is asserted empty rather than left to the
// counts. The limit case uses a path outside any `__tests__/` folder on purpose: inside one the
// folder rule already answers, so a `.spec` dropped from the suffix pattern would go unnoticed.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Glob } from "bun";
import { isTestFile, limitOf } from "../../tools/file-lines.ts";
import { MAX_TEST_LINES } from "../../tools/limits.ts";
import { PLUGIN_DIR, shippedSources } from "../../tools/source-text.ts";

/** A tree with one shipped module and one test beside it in a `__tests__/` folder. */
const treeWithTests = async (): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "claudetto-tests-folder-"));
	const src = join(root, PLUGIN_DIR, "src");
	await mkdir(join(src, "__tests__"), { recursive: true });
	await writeFile(join(src, "shipped.ts"), "export const shipped = 1;\n");
	await writeFile(
		join(src, "__tests__", "shipped.test.ts"),
		"export const planted = 2;\n",
	);
	await writeFile(join(src, "__tests__", "helper.ts"), "export const h = 3;\n");
	return root;
};

describe("a `__tests__/` folder beside a source", () => {
	test("is not read as a shipped source", async () => {
		const files = await shippedSources(await treeWithTests());
		expect(files.map((f) => f.path)).toEqual([`${PLUGIN_DIR}/src/shipped.ts`]);
	});

	test("gives its test file the test line limit", () => {
		expect(
			isTestFile("plugins/claudetto/src/window/__tests__/window.test.ts"),
		).toBe(true);
		expect(
			limitOf("plugins/claudetto/src/window/__tests__/window.test.ts"),
		).toBe(MAX_TEST_LINES);
	});

	test("gives a helper that is not named `*.test.ts` the test line limit too", () => {
		expect(
			isTestFile("plugins/claudetto/src/gate/__tests__/facts-stub.ts"),
		).toBe(true);
		expect(limitOf("plugins/claudetto/src/gate/__tests__/facts-stub.ts")).toBe(
			MAX_TEST_LINES,
		);
	});

	test("gives a `.spec.ts` file the test line limit wherever it sits", () => {
		expect(isTestFile("tools/beside/window.spec.ts")).toBe(true);
		expect(limitOf("tools/beside/window.spec.ts")).toBe(MAX_TEST_LINES);
	});
});

describe("the suffix that splits the two runners", () => {
	test("no unit test under a plugin is named `*.test.ts`", async () => {
		const root = join(import.meta.dir, "..", "..");
		const collected = await Array.fromAsync(
			new Glob("plugins/*/src/**/__tests__/*.test.{ts,tsx}").scan(root),
		);
		expect(collected).toEqual([]);
	});
});
