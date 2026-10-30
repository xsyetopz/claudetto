import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { shippedSources } from "../../tools/source-text.ts";

const ROOT = join(import.meta.dir, "..", "..");

const SHIPPED: readonly string[] = [
	"answer.ts",
	"blocks/block.ts",
	"blocks/catalog.ts",
	"blocks/you-should-know/block.ts",
	"cadence.ts",
	"cards.ts",
	"check.ts",
	"choices.ts",
	"constants.ts",
	"digest.ts",
	"draft.ts",
	"draw.ts",
	"hooks.ts",
	"lines.ts",
	"memory.ts",
	"options.ts",
	"ports.ts",
	"prompt.ts",
	"register.ts",
	"reply.ts",
	"rows.ts",
];

const LEFT_OUT =
	/page|artifact|direction|advert|tip|flag|gate|taint|compliance/i;

const UNDER_SRC = /^.*\/src\//;

const namesOf = async (): Promise<readonly string[]> =>
	(await shippedSources(ROOT)).map((file) => file.path.replace(UNDER_SRC, ""));

describe("the rebuilt observer ships one file list", () => {
	test("the shipped files are exactly the list", async () => {
		const names = await namesOf();

		expect(names).toEqual(SHIPPED);
	});

	test("no shipped file is named for a left-out part", async () => {
		const names = await namesOf();

		expect(names.filter((name) => LEFT_OUT.test(name))).toEqual([]);
	});
});
