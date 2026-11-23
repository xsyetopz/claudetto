import { call, type Samples, wrote } from "./eval-case-samples";
import {
	cites,
	DISCOUNT,
	example,
	names,
	NEW_HEADING,
	PASS_AT_END,
	SCENARIO,
	SPEC_KEPT,
	STAGE
} from "./spec-eval-sample-parts";
import { STOP_SAMPLES } from "./spec-eval-stop-samples";

// Samples for the regex graders of the claudetto-spec suite, keyed `<case>/<grader>`.

function feature(name: string): Record<string, Samples> {
	return {
		[`${name}/existing-spec-kept`]: SPEC_KEPT,
		[`${name}/existing-tests-kept`]: {
			badFile: [["toBe(0)", "toBe(-5)"]],
			goodFile: []
		},
		[`${name}/impl-written`]: { badFile: [], good: [DISCOUNT] },
		[`${name}/rounds-down-example-tested`]: {
			bad: [
				example(995, 10, 896),
				`${example(995, 10, 895)}\n${example(995, 10, 896)}`
			],
			badFile: [],
			good: [example(995, 10, 895)]
		},
		[`${name}/spec-new-id-heading-written`]: NEW_HEADING,
		[`${name}/staged-before-impl`]: {
			bad: [`${call("Edit", "src/cart.ts")}\n${STAGE}`],
			good: [`${STAGE}\n${call("Edit", "src/cart.ts")}`]
		},
		[`${name}/test-cites-new-id`]: { badFile: [], good: [cites("DISC-1")] },
		[`${name}/tests-pass-at-end`]: PASS_AT_END
	};
}

const LOOP: Record<string, Samples> = {
	...feature("feature-discount"),
	...feature("feature-discount-p2"),
	"ambiguous-headless/corrected-name-used": {
		bad: [DISCOUNT.replace("applyDiscount", "addTax")],
		badFile: [],
		good: [DISCOUNT.replace("applyDiscount", "totalWithTax")]
	},
	"ambiguous-headless/spec-has-open-line": {
		bad: [wrote("## TAX-1 Total with tax\n\nThe rate is a fraction.\n")],
		good: [
			wrote("## TAX-1 Total with tax\n\nOpen: rate form; assumed a fraction\n")
		]
	},
	"feature-discount/readme-typo-fixed": {
		badFile: [],
		goodFile: [["recieve", "receive"]]
	},
	"spec-edit-command/cap-example-tested": names(
		example(999, 60, 499),
		example(999, 60, 399)
	),
	"spec-edit-command/cap-implemented": {
		badFile: [],
		good: ["const CAP = 50;"]
	},
	"spec-edit-command/floor-example-tested": names(
		example(1, 50, 1),
		example(1, 50, 0)
	),
	"spec-edit-command/impl-exported": { badFile: [], good: [DISCOUNT] },
	"spec-edit-command/rounding-example-tested": names(
		example(999, 10, 899),
		example(999, 10, 900)
	),
	"spec-edit-command/spec-kept": {
		badFile: [["Then the total is 1\n", "Then the total is 0\n"]],
		goodFile: []
	},
	"spec-edit-command/test-cites-disc1": {
		badFile: [],
		good: [cites("DISC-1")]
	},
	"spec-edit-command/test-cites-disc2": {
		badFile: [],
		good: [cites("DISC-2")]
	},
	"spec-edit-command/test-cites-disc3": {
		badFile: [],
		good: [cites("DISC-3")]
	},
	"spec-edit-command/tests-pass-at-end": PASS_AT_END,
	"spec-edit-skill/cap-implemented": {
		badFile: [],
		good: ["Math.min(percent, 50)"]
	},
	"spec-edit-skill/cap-tested": { badFile: [], good: [example(1000, 80, 500)] },
	"spec-edit-skill/reply-reports-rounding-change": names(
		"Added the DISC-2 cap. The spec edit also changed DISC-1 to round to the nearest cent, so 995 at 10 percent is 896.",
		"Added the cap and its test; all tests pass."
	),
	"spec-edit-skill/rounding-example-tested": {
		bad: [example(995, 10, 895)],
		badFile: [],
		good: [example(995, 10, 896)]
	},
	"spec-edit-skill/spec-kept": {
		badFile: [
			["rounded to the nearest cent, a half rounding up", "rounded down"]
		],
		goodFile: []
	},
	"spec-edit-skill/test-cites-disc1": {
		bad: [cites("takes 10 percent off")],
		goodFile: []
	},
	"spec-edit-skill/test-cites-disc2": { badFile: [], good: [cites("DISC-2")] },
	"spec-edit-skill/tests-pass-at-end": PASS_AT_END,
	"specify-discount/existing-spec-kept": SPEC_KEPT,
	"specify-discount/reply-points-to-implement": names(
		"Review the spec, then run /claudetto-spec:implement.",
		"The spec is written and the code is in place."
	),
	"specify-discount/spec-new-id-heading-written": NEW_HEADING,
	"specify-discount/spec-states-rounded-down-example": names(
		wrote(SCENARIO),
		wrote(SCENARIO.replace("895", "896"))
	),
	"specify-discount/stub-unchanged": {
		badFile: [
			['throw new Error("not implemented");', "return _total - _percent;"]
		],
		goodFile: []
	},
	"specify-discount/test-unchanged": {
		badFile: [['test.todo("applies a percentage discount");', cites("DISC-1")]],
		goodFile: []
	}
};

/** The samples of every regex grader in the claudetto-spec suite. */
export const SPEC_SAMPLES: Readonly<Record<string, Samples>> = {
	...LOOP,
	...STOP_SAMPLES
};
