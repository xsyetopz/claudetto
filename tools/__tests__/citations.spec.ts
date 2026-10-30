// The check refuses a `path:line` citation that points at no line. Each case plants a tree and a page
// and asserts what the check returns, because the decision is the fault list and not its wording.

import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	citationFaultsIn,
	citationLines,
	citationsIn,
	faultsOf,
} from "../citations.ts";

/** A tree under a fresh temp root holding `files`, each a map of path to its text. */
const treeOf = async (files: Record<string, string>): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "claudetto-citations-"));
	await Promise.all(
		Object.entries(files).map(async ([path, text]) => {
			await mkdir(join(root, path, ".."), { recursive: true });
			await writeFile(join(root, path), text);
		}),
	);
	return root;
};

/** A source file of ten lines. */
const TEN = "x\n".repeat(10);

/** The faults of one page of text read against a tree of `files`. */
const faultsFor = async (
	page: string,
	files: Record<string, string> = { "tools/a.ts": TEN },
) => {
	const root = await treeOf(files);
	return faultsOf(root, citationsIn("docs/p.md", page));
};

describe("citations", () => {
	test("a citation whose line exists passes", async () => {
		const faults = await faultsFor("See `tools/a.ts:10`.");

		expect(faults).toEqual([]);
	});

	test("a citation past the end names the line and the length of the file", async () => {
		const faults = await faultsFor("See `tools/a.ts:11`.");

		expect(faults).toHaveLength(1);
		expect(faults[0]?.reason).toContain("tools/a.ts:11");
		expect(faults[0]?.reason).toContain("10 lines");
	});

	test("a missing path is a fault", async () => {
		const faults = await faultsFor("See `tools/gone.ts:1`.");

		expect(faults).toHaveLength(1);
		expect(faults[0]?.reason).toContain("tools/gone.ts");
	});

	test("both ends of a range are checked", async () => {
		const faults = await faultsFor(
			"A `tools/a.ts:3-10` and B `tools/a.ts:3-11`.",
		);

		expect(faults).toHaveLength(1);
		expect(faults[0]?.reason).toContain("tools/a.ts:3-11");
	});

	test("a URL span is not read as a citation", () => {
		const found = citationsIn("p.md", "Open `https://example.com/a/b.ts:9`.");

		expect(found).toEqual([]);
	});

	test("a span with no slash and no extension is not read as a citation", () => {
		const found = citationsIn("p.md", "At `12:30` on port `:80` or `host:80`.");

		expect(found).toEqual([]);
	});

	test("a citation outside backticks is not read", () => {
		const found = citationsIn("p.md", "See tools/a.ts:99 in prose.");

		expect(found).toEqual([]);
	});

	test("a path whose first segment is not an entry of the root is left alone", async () => {
		const faults = await faultsFor(
			"See `hooks/module.js:9` and `chunk-ab.js:2`.",
		);

		expect(faults).toEqual([]);
	});

	test("a dated page is left out of the walk", async () => {
		const root = await treeOf({
			"tools/a.ts": TEN,
			"docs/test-diet.md": "`tools/gone.ts:1`\n",
			"docs/p.md": "`tools/gone.ts:1`\n",
		});

		const faults = await citationFaultsIn(root);

		expect(faults.map((f) => f.page)).toEqual(["docs/p.md"]);
	});

	test("a decision page under docs/keep is read", async () => {
		const root = await treeOf({
			"tools/a.ts": TEN,
			"docs/keep/skills/s.txt": "SOURCE: `tools/gone.ts:1`\n",
		});

		const faults = await citationFaultsIn(root);

		expect(faults.map((f) => f.page)).toEqual(["docs/keep/skills/s.txt"]);
	});

	test("the walk reads docs and root pages and leaves openspec alone", async () => {
		const root = await treeOf({
			"tools/a.ts": TEN,
			"docs/p.md": "`tools/a.ts:99`\n",
			"README.md": "`tools/a.ts:5`\n",
			"openspec/changes/c/survey.md": "`dev/gone.ts:1`\n",
		});

		const faults = await citationFaultsIn(root);

		expect(citationLines(faults)).toEqual([
			"docs/p.md:1: cites tools/a.ts:99, and tools/a.ts holds 10 lines",
		]);
	});
});
