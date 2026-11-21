import { expect, test } from "bun:test";

import type { JevConfig } from "../jev-grade/config";
import { buildRequest, redact } from "../jev-grade/request";
import { classify, runScore, tally } from "../jev-grade/score";

const config: JevConfig = {
	facts: "check exits 1 in /Users/alice/proj",
	questions: {
		a: { instructions: "A?", weight: 3 },
		b: {
			instructions: "B?",
			criteria: { true: "yes case", false: "no case" },
			weight: 1
		}
	}
};

test("the run score is the weighted mean of the probabilities", () => {
	// Act
	const score = runScore(config, { a: 1, b: 0 });

	// Assert
	expect(score).toBeCloseTo(0.75, 10);
});

test("thresholds split yes, no and unsettled at 0.7 and 0.3", () => {
	expect(
		[0.9, 0.7, 0.69, 0.5, 0.31, 0.3, 0.05].map((value) => classify(value))
	).toEqual(["yes", "yes", "unsettled", "unsettled", "unsettled", "no", "no"]);
});

test("a tally counts each verdict and averages", () => {
	// Act
	const result = tally([0.9, 0.8, 0.5, 0.1]);

	// Assert
	expect(result?.mean).toBeCloseTo(0.575, 10);
	expect(result).toMatchObject({ yes: 2, no: 1, unsettled: 1 });
	expect(tally([])).toBeUndefined();
});

test("home paths become ~", () => {
	expect(redact("see /Users/alice/proj/a.ts and /Users/bob/x")).toBe(
		"see ~/proj/a.ts and ~/x"
	);
});

test("the request holds the model, the redacted state and Noul questions", () => {
	// Act
	const request = buildRequest(
		config,
		"fix /Users/alice/a",
		"done in /Users/alice/b"
	);

	// Assert
	expect(request).toEqual({
		model: "jev-1.14.0",
		state: {
			task: "fix ~/a",
			facts: "check exits 1 in ~/proj",
			reply: "done in ~/b"
		},
		questions: {
			a: { type: "noul", instructions: "A?" },
			b: {
				type: "noul",
				instructions: "B?",
				criteria: { true: "yes case", false: "no case" }
			}
		}
	});
});
