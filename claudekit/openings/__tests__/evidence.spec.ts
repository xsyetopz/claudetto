import { describe, expect, test } from "bun:test";
import { firstSentence, hasEvidence } from "../evidence.ts";

describe("the first sentence of a reply", () => {
	test("ends at the first sentence end", () => {
		expect(firstSentence("All green. The rest follows.")).toBe("All green.");
	});

	test("skips a blank line and drops a heading marker", () => {
		expect(
			firstSentence(`

## Outcome

the rest`),
		).toBe("Outcome");
	});

	test("drops a list marker", () => {
		expect(
			firstSentence(`- \`just check\` passes.
more`),
		).toBe("`just check` passes.");
	});

	test("a line with no sentence end is the whole line", () => {
		expect(
			firstSentence(`Now the cut inventory:
next`),
		).toBe("Now the cut inventory:");
	});

	test("an empty answer gives an empty sentence", () => {
		expect(firstSentence("")).toBe("");
	});
});

describe("the evidence of an opening", () => {
	test("a code span counts", () => {
		expect(hasEvidence("`cuts.ts` carries the row.")).toBe(true);
	});

	test("a digit counts", () => {
		expect(hasEvidence("The arm reads 27,323.")).toBe(true);
	});

	test("prose alone does not, which is why the signal was turned down", () => {
		expect(hasEvidence("Both edits are in and validated.")).toBe(false);
	});
});
