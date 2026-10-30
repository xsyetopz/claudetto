// The rule is checked by what it reports for rows passed in, and the last block is the rule over the
// real rows and the real pages.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { TIERS } from "../../plugins/claudetto/src/tiers/tiers.ts";
import {
	faultLines,
	itemsOf,
	pageFaults,
	pagesIn,
} from "../../tools/keep-pages.ts";

const ROOT = join(import.meta.dir, "..", "..");

const row = (describeSet: readonly string[]) => ({
	tier: "claude_pro",
	subagentCap: 3,
	contextCap: 300_000,
	handoffTokens: 140_000,
	haiku: { contextCap: 200_000, handoffTokens: 90_000 },
	describeSet,
});

describe("a tool a row names", () => {
	test("is a fault when no page of its kind covers it", () => {
		const pages = new Map([["tool", ["Read"]]] as const);

		const faults = pageFaults(itemsOf([row(["NoSuchTool"])]), pages);

		expect(faultLines(faults)).toStrictEqual([
			"docs/keep/tools/NoSuchTool.txt: no decision page for the tool `NoSuchTool`, which a tier row names",
		]);
	});

	test("is no fault when a page covers it", () => {
		const pages = new Map([["tool", ["Read"]]] as const);

		expect(pageFaults(itemsOf([row(["Read"])]), pages)).toStrictEqual([]);
	});

	test("is counted once when more than one row names it", () => {
		const items = itemsOf([row(["Read"]), row(["Read", "Bash"])]);

		expect(items.map((item) => item.name)).toStrictEqual(["Read", "Bash"]);
	});

	test("is a fault when the folder of its kind holds nothing", () => {
		const faults = pageFaults(itemsOf([row(["Read"])]), new Map());

		expect(faults).toHaveLength(1);
	});
});

describe("the pages of the tree", () => {
	test("are read for each kind of surface", async () => {
		const pages = await pagesIn(ROOT);

		// The reading of `specs/repo-gate/spec.md:37`, the scenario this check answers.
		expect(pages.get("tool")).toHaveLength(37);
		expect(pages.get("skill")).toHaveLength(46);
		expect(pages.get("command")).toHaveLength(1);
		expect(pages.get("plugin")).toHaveLength(16);
	});

	test("cover every surface the rows of the table name", async () => {
		const faults = pageFaults(itemsOf(TIERS), await pagesIn(ROOT));

		expect(faultLines(faults)).toStrictEqual([]);
	});
});
