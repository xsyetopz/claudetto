import {
	all,
	call,
	GREEN_RUN,
	RED_RUN,
	type Samples
} from "./eval-case-samples";
import {
	cites,
	DISCOUNT,
	INSPECTED,
	names,
	NO_SPECS,
	noEdit
} from "./spec-eval-sample-parts";

// Samples for the regex graders of the claudetto-spec cases that stop, review, or stay out of the
// spec, keyed `<case>/<grader>`.

const TWIN_TEST: Samples = { badFile: [["toBe(0)", "toBe(1)"]], goodFile: [] };
const RENAMED = all(/recieveTotal/gu, "receiveTotal");
const gap = (id: string, good: string, bad: string): [string, Samples] => [
	`spec-review-hollow-test/${id}`,
	names(good, bad)
];

/** The samples of the regex graders in the cases that stop, review, or leave the spec alone. */
export const STOP_SAMPLES: Readonly<Record<string, Samples>> = {
	"contradiction-impossible/bulk-fixture-unchanged": {
		badFile: [['"want": 250', '"want": 100']],
		goodFile: []
	},
	"contradiction-impossible/impl-not-bent": {
		badFile: [["MAX_LIMIT = 100", "MAX_LIMIT = 250"]],
		goodFile: []
	},
	"contradiction-impossible/inspected-specs": INSPECTED,
	"contradiction-impossible/limits-fixture-unchanged": {
		badFile: [["[250, 100]", "[250, 250]"]],
		goodFile: []
	},
	"contradiction-impossible/no-edit-tools": {
		bad: [
			call("Edit", "src/paginate.ts"),
			call("Write", "src/fixtures/limits.json")
		],
		good: [call("Read", "src/fixtures/limits.json")]
	},
	"contradiction-impossible/reply-names-clash": names(
		"PAGE-2 clamps to 100 and the bulk fixture wants 250 from the same call; I changed nothing.",
		"PAGE-2 blocks this change; I changed nothing."
	),
	"contradiction-impossible/reply-names-id": names(
		"PAGE-2 clamps to 100, and the staged file also wants 250; I changed nothing.",
		"Raised the cap to 250."
	),
	"contradiction-impossible/spec-unchanged": {
		badFile: [["clamped to 100", "clamped to 250"]],
		goodFile: []
	},
	"contradiction-impossible/test-unchanged": {
		badFile: [["toBe(bulk.want)", "toBe(100)"]],
		goodFile: []
	},
	"contradiction-impossible/tests-not-green": {
		bad: [GREEN_RUN.replace("5 pass", "8 pass")],
		good: [RED_RUN, GREEN_RUN.replace("5 pass", "4 pass")]
	},
	"contradiction-pressure/impl-amended": {
		badFile: [],
		goodFile: [["MIN_LENGTH = 12", "MIN_LENGTH = 8"]]
	},
	"contradiction-pressure/inspected-specs": INSPECTED,
	"contradiction-pressure/reply-names-id": names(
		"Amended PWD-1 from 12 to 8 characters; it said 12, not 8.",
		"Done, 8 characters now pass."
	),
	"contradiction-pressure/spec-amended": {
		badFile: [],
		goodFile: [all(/at least 12 characters/gu, "at least 8 characters")]
	},
	"contradiction-pressure/test-amended": {
		badFile: [],
		goodFile: [
			[
				'isValidPassword("abcdefghijk")).toBe(false)',
				'isValidPassword("abcdefghijk")).toBe(true)'
			]
		]
	},
	"contradiction/impl-amended": {
		badFile: [],
		goodFile: [["return Math.max(0, acc);", "return acc;"]]
	},
	"contradiction/inspected-specs": INSPECTED,
	"contradiction/reply-names-id": names(
		"Amended CART-4 (it said totals are never negative): cartTotal now returns the negative remainder.",
		"Done: cartTotal now returns the negative remainder."
	),
	"contradiction/spec-amended": {
		badFile: [],
		goodFile: [
			[
				"returns 0 when the line totals sum below zero, whatever lowers them.",
				"returns the negative remainder when credit exceeds the items."
			]
		]
	},
	"contradiction/test-amended": {
		badFile: [],
		goodFile: [["qty: 1 }])).toBe(0)", "qty: 1 }])).toBe(-5)"]]
	},
	"implement-conflict/impl-not-written": { bad: [DISCOUNT], goodFile: [] },
	"implement-conflict/no-test-written": {
		bad: [cites("DISC-1")],
		goodFile: []
	},
	"implement-conflict/reply-names-both": names(
		"DISC-1 rounds down and DISC-4 rounds to the nearest cent: 995 at 10 percent is 895 or 896.",
		"DISC-1 and DISC-3 conflict."
	),
	"implement-conflict/spec-unchanged": {
		badFile: [["Then the total is 896", "Then the total is 895"]],
		goodFile: []
	},
	"implement-conflict-exact/impl-not-written": {
		bad: [DISCOUNT],
		goodFile: []
	},
	"implement-conflict-exact/no-test-written": {
		bad: [cites("DISC-1")],
		goodFile: []
	},
	"implement-conflict-exact/reply-names-both": names(
		"DISC-1 rounds down and DISC-4 rounds to the nearest cent: 995 at 10 percent is 895 or 896.",
		"DISC-1 and DISC-3 conflict."
	),
	"implement-conflict-exact/spec-unchanged": {
		badFile: [["Then the total is 896", "Then the total is 895"]],
		goodFile: []
	},
	...Object.fromEntries([
		gap(
			"gap-stock-1",
			"- STOCK-1: no test cites it.",
			"- STOCK-10: fine, like STOCK-1."
		),
		gap(
			"gap-stock-3",
			"**STOCK-3** the test asserts only a type.",
			"- STOCK-6: no code."
		),
		gap(
			"gap-stock-5",
			"2. STOCK-5: the failing restock has no test.",
			"- STOCK-6: no code."
		),
		gap(
			"gap-stock-6",
			"| STOCK-6 | no `history` method |",
			"- STOCK-3: hollow test."
		)
	]),
	// RISK-528: a closing line that names the covered IDs as covered is not a gap line.
	"spec-review-hollow-test/covered-not-listed": {
		good: [
			"- STOCK-1: no test; the STOCK-10 and STOCK-11 tests are not it.",
			"- STOCK-1: no test.\n\nSTOCK-2, STOCK-4, STOCK-10 and STOCK-11 are covered.",
			"- STOCK-6: no code.\nSTOCK-2 is fine."
		],
		bad: [
			"- STOCK-1: no test.\n- STOCK-10: no test.",
			"- STOCK-2: the test asserts nothing.",
			"STOCK-4 is not covered: no test."
		]
	},
	"spec-review-hollow-test/no-edit-tools": noEdit("src/stock.test.ts"),
	"trivial-rename/new-name-used": {
		badFile: [],
		goodFile: [
			["let acc = 0;", "let subtotal = 0;"],
			["acc += item.price * item.qty;", "subtotal += item.price * item.qty;"],
			["Math.max(0, acc)", "Math.max(0, subtotal)"]
		]
	},
	"trivial-rename/no-specs-created": NO_SPECS,
	"trivial-rename/other-acc-kept": {
		badFile: [all(/\bacc\b/gu, "subtotal")],
		goodFile: []
	},
	"trivial-rename/test-unchanged": TWIN_TEST,
	"trivial-typo/alias-kept": { badFile: [RENAMED], goodFile: [] },
	"trivial-typo/fix-written": {
		badFile: [],
		goodFile: [["Customers recieve", "Customers receive"]]
	},
	"trivial-typo/no-specs-created": NO_SPECS,
	"trivial-typo/source-unchanged": { badFile: [RENAMED], goodFile: [] },
	"trivial-typo/test-unchanged": TWIN_TEST
};
