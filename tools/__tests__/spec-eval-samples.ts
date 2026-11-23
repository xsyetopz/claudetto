import { all, call, type Samples, wrote } from "./eval-case-samples";
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

const TOTAL_WITH_TAX = DISCOUNT.replace("applyDiscount", "totalWithTax");

// A trace line for a Write of a test file whose one test has this title.
const testWrite = (title: string): string =>
	`{"type":"tool_use","name":"Write","input":{"file_path":"/tmp/x/src/shipping.test.ts","content":"test(\\"${title}\\", () => {});"}}`;

function feature(name: string): Record<string, Samples> {
	return {
		[`${name}/checkout-spec-kept`]: {
			badFile: [["Then the total is 1099", "Then the total is 1100"]],
			goodFile: []
		},
		[`${name}/existing-spec-kept`]: SPEC_KEPT,
		[`${name}/existing-tests-kept`]: {
			badFile: [["toBe(0)", "toBe(-5)"]],
			goodFile: []
		},
		[`${name}/float-factor-avoided`]: {
			bad: ["\treturn Math.floor(total * (1 - percent / 100));"],
			good: ["\treturn Math.floor((total * (100 - percent)) / 100);"],
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
		[`${name}/spec-new-id-heading-written`]: {
			...NEW_HEADING,
			bad: [
				...(NEW_HEADING.bad ?? []),
				wrote("\n## CART-3 Percentage discount\n")
			]
		},
		[`${name}/staged-before-impl`]: {
			bad: [`${call("Edit", "src/cart.ts")}\n${STAGE}`],
			good: [`${STAGE}\n${call("Edit", "src/cart.ts")}`]
		},
		[`${name}/test-cites-new-id`]: {
			bad: [cites("CART-3")],
			badFile: [],
			good: [cites("DISC-1")]
		},
		[`${name}/tests-pass-at-end`]: PASS_AT_END
	};
}

const LOOP: Record<string, Samples> = {
	...feature("feature-discount"),
	...feature("feature-discount-p2"),
	"ambiguous-headless/corrected-name-used": {
		bad: [
			DISCOUNT.replace("applyDiscount", "addTax"),
			`import { addTax } from "./legacy/checkout";\n${TOTAL_WITH_TAX}`
		],
		badFile: [],
		good: [TOTAL_WITH_TAX]
	},
	"ambiguous-headless/rate-form-from-code": {
		bad: [`${TOTAL_WITH_TAX}\n\treturn Math.round(total * (1 + rate));`],
		badFile: [],
		good: [`${TOTAL_WITH_TAX}\n\treturn total + taxOn(total, rate);`]
	},
	"ambiguous-headless/reply-flags-readme": names(
		"Assumed the rate is in basis points, as src/tax.ts takes it; the README says a fraction, and a fraction returns 0.",
		"Added totalWithTax with tests; the rate is a fraction."
	),
	"ambiguous-headless/spec-has-open-line": {
		bad: [wrote("## TAX-1 Total with tax\n\nThe rate is a fraction.\n")],
		good: [
			wrote("## TAX-1 Total with tax\n\nOpen: rate form; assumed a fraction\n")
		]
	},
	"feature-discount-p2/reply-corrects-claim": names(
		"specs/cart.md already holds CART-1 and CART-2, so the discount is DISC-1.",
		"Wrote the first spec and tests for the cart from scratch."
	),
	"feature-discount/option-name-kept": {
		badFile: [all(/recieveCopy/gu, "receiveCopy")],
		goodFile: []
	},
	// The prose typo is fixed; `recieveCopy` is the option's real name and stays.
	"feature-discount/readme-typo-fixed": {
		bad: ["Customers recieve one total. Pass `recieveCopy: true`.\n"],
		badFile: [all(/recieve/gu, "receive")],
		goodFile: [["Customers recieve", "Customers receive"]]
	},
	"spec-edit-command/cap-example-tested": names(
		example(999, 60, 499),
		example(999, 60, 399)
	),
	"spec-edit-command/cap-implemented": {
		badFile: [],
		good: ["const CAP = 50;"]
	},
	"spec-edit-command/float-example-tested": {
		bad: [example(1000, 7, 929)],
		badFile: [],
		good: [example(1000, 7, 930), "\t[1000, 7, 930],"]
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
	"spec-edit-command/ship-impl-written": names(
		"export function shippingFee(total: number): number {",
		"export function shippingCost(total: number): number {"
	),
	"spec-edit-command/ship-spec-kept": {
		badFile: [["Then the fee is 499", "Then the fee is 500"]],
		goodFile: []
	},
	"spec-edit-command/ship-test-written": names(
		testWrite("SHIP-1 an order under 5000 pays 499"),
		`${testWrite("an order under 5000 pays 499")}\n${wrote("## SHIP-1 Free shipping threshold\n")}`
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
	"spec-edit-command/zero-example-tested": names(
		example(0, 50, 0),
		example(0, 50, 1)
	),
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
	"specify-discount/legacy-unchanged": {
		badFile: [["Math.round", "Math.floor"]],
		goodFile: []
	},
	"specify-discount/reply-flags-live-behaviour": names(
		"applyDiscount is not a stub: it calls legacyDiscount, which rounds to the nearest cent.",
		"Wrote DISC-1 with the 895 example; review it, then run /claudetto-spec:implement."
	),
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
			[
				"return legacyDiscount(total, percent);",
				"return Math.floor((total * (100 - percent)) / 100);"
			]
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
