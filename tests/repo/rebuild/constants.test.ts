import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BORROWED,
	OWN,
} from "../../../plugins/claudetto-you-should-know/src/constants.ts";
import { quoteFaults, SOURCE_NOTE } from "../../../tools/rebuild/constants.ts";

const NOTE = join(import.meta.dir, "..", "..", "..", SOURCE_NOTE);

describe("a constant of the rebuild", () => {
	test("is a fault when the note quotes no line for it", () => {
		const note = "`CHECK_EVERY` = `6` (1306)";

		const faults = quoteFaults({ MAX_CARDS: 4 }, note);

		expect(faults).toStrictEqual([
			"`MAX_CARDS` = `4` is not quoted in docs/keep/plugins/you-should-know-source-2.1.310.txt, so the rebuild would run on a value the source note does not record",
		]);
	});

	test("is a fault when the note quotes it with another value", () => {
		const note = "`CHECK_EVERY` = `8` (1306)";

		expect(quoteFaults({ CHECK_EVERY: 6 }, note)).toHaveLength(1);
	});

	test("is no fault when the note quotes its name and its value together", () => {
		const note = "`CHECK_EVERY` = `6` (1306)";

		expect(quoteFaults({ CHECK_EVERY: 6 }, note)).toStrictEqual([]);
	});

	test("is no fault when its value is a string the note quotes", () => {
		const note = "`DEFAULT_TAG` = `You should know` (1395)";

		expect(quoteFaults({ DEFAULT_TAG: "You should know" }, note)).toStrictEqual(
			[],
		);
	});

	test("is a fault when the name and the value sit on separate lines", () => {
		const note = `\`CHECK_EVERY\` is the cadence (1306)
the value is \`6\``;

		expect(quoteFaults({ CHECK_EVERY: 6 }, note)).toHaveLength(1);
	});

	test("matches a note value written without digit separators", () => {
		const note = "`SHOWN_KEEP_MS` = `259200000` (2364)";

		expect(quoteFaults({ SHOWN_KEEP_MS: 259_200_000 }, note)).toStrictEqual([]);
	});
});

describe("the constants module of the rebuild", () => {
	test("has every borrowed value quoted in the source note", async () => {
		const note = await readFile(NOTE, "utf8");

		expect(quoteFaults(BORROWED, note)).toStrictEqual([]);
	});

	test("has every bound of its own quoted in the source note", async () => {
		const note = await readFile(NOTE, "utf8");

		expect(quoteFaults(OWN, note)).toStrictEqual([]);
	});
});
