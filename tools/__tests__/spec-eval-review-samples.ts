import type { Sample } from "./spec-eval-graders";

// Known-good and known-bad samples for the spec-review-hollow-test graders (ADR-0193 rule 3).

/** One entry per regex grader of the `spec-review-hollow-test` case. */
export const specReviewSamples: [string, Sample][] = [
	...[2, 3, 4].map((n): [string, Sample] => [
		`spec-review-hollow-test/names-stock-${n}`,
		{
			bad: `STOCK-${n + 10} has no code; STOCK-1 is covered.`,
			good: `STOCK-${n}: gap.`
		}
	]),
	[
		"spec-review-hollow-test/stock-1-not-a-gap",
		{
			bad: "STOCK-1 - hollow test: src/stock.test.ts:5\nSTOCK-2 - no code",
			good: "STOCK-2 - hollow test: src/stock.test.ts:10\nSTOCK-1 is covered.\nChecked 4 requirements, 3 gaps."
		}
	]
];
