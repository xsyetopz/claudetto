// The rebuild ships only the parts that change what the person does in the code. So the file list is
// asserted whole: a part that was left out comes back as a module, and a module the list does not
// name fails here before it ships.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { shippedSources } from "../../tools/source-text.ts";

const ROOT = join(import.meta.dir, "..", "..");

/** Every `.ts` file the plugin ships under `src/`, as the whole list rather than a floor. */
const SHIPPED: readonly string[] = [
	"answer.ts",
	"cadence.ts",
	"cards.ts",
	"check.ts",
	"choices.ts",
	"constants.ts",
	"digest.ts",
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

/**
 * A name that would mean a left-out part came back: the learning page and its artifact, the
 * follow-up directions of an explanation, the advertisement tip, and the flag or compliance gate.
 */
const LEFT_OUT =
	/page|artifact|direction|advert|tip|flag|gate|taint|compliance/i;

/** The path the helper reports is rooted at the tree, so the leading folders come off. */
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
