import type { Sample } from "./spec-eval-graders";

// Known-good and known-bad samples for the review-point cases (ADR-0193 rule 3): a reviewer adds
// DISC-2 (`spec-edit-*`) or changes DISC-1 (`spec-fix-*`), after DISC-1 shipped (`-skill`) or after
// `/claudetto-spec:specify` stopped (`-command`); `specify-discount` stops after the spec, and
// `implement-conflict` stops on two requirements no code can satisfy.

const greenRun = String.raw`{"type":"tool_result","content":" 4 pass\n 0 fail\n 5 expect() calls\nRan 4 tests"}`;
const redRun = String.raw`{"type":"tool_result","content":"(fail) DISC-2\n\n 3 pass\n 1 fail\nRan 4 tests"}`;

const capSamples: [string, Sample][] = [
	[
		"cap-implemented",
		{
			bad: "export function applyDiscount(total: number, percent: number): number {\n\treturn Math.floor((total * (100 - percent)) / 100);\n}\n",
			good: "export function applyDiscount(total: number, percent: number): number {\n\tconst p = Math.min(percent, 50);\n\treturn Math.floor((total * (100 - p)) / 100);\n}\n"
		}
	],
	[
		"cap-tested",
		{
			bad: 'test("DISC-2 caps the discount", () => {\n\texpect(applyDiscount(1000, 50)).toBe(500);\n});\n',
			good: 'test("DISC-2 caps the discount", () => {\n\texpect(applyDiscount(1000, 80)).toBe(500);\n});\n'
		}
	],
	[
		"spec-kept",
		{
			bad: "# Cart\n\n## DISC-1 Percentage discount\n\nThe total drops.\n",
			good: "# Cart\n\n## DISC-1 Percentage discount\n\nThe total drops.\n\n## DISC-2 Discount cap\n\nA percent above 50 applies as 50.\n"
		}
	],
	...[1, 2].map((n): [string, Sample] => [
		`test-cites-disc${n}`,
		{
			bad: `test("applies the rule", () => {\n\t// DISC-${n}\n});\n`,
			good: `test("DISC-${n} applies the rule", () => {\n});\n`
		}
	]),
	[
		"tests-pass-at-end",
		{ bad: [greenRun, redRun].join("\n"), good: [redRun, greenRun].join("\n") }
	]
];

const fixSamples: [string, Sample][] = [
	[
		"floor-test-gone",
		{
			bad: 'test("DISC-1 takes 10 percent off 995 cents", () => {\n\texpect(applyDiscount(995, 10)).toBe(895);\n});\n',
			good: 'test("DISC-1 takes 10 percent off 995 cents", () => {\n\texpect(applyDiscount(995, 10)).toBe(896);\n});\n\ntest("DISC-1 rounds 894.6 to 895", () => {\n\texpect(applyDiscount(994, 10)).toBe(895);\n});\n'
		}
	],
	[
		"rounding-tested",
		{
			bad: "\texpect(applyDiscount(995, 10)).toBe(895);\n",
			good: "\texpect(applyDiscount(995, 10)).toBe(896);\n"
		}
	],
	[
		"spec-kept",
		{
			bad: "## DISC-1 Percentage discount\n\nThe total minus percent, in integer cents rounded down;\n\nThen the total is 895\n",
			good: "## DISC-1 Percentage discount\n\nThe total minus percent, in integer cents rounded to the nearest cent;\n\nThen the total is 896\n"
		}
	],
	...capSamples.filter(([grader]) =>
		["test-cites-disc1", "tests-pass-at-end"].includes(grader)
	)
];

const commandSamples: [string, Sample][] = [
	[
		"specify-discount/no-impl-written",
		{
			bad: "export function applyDiscount(total: number, percent: number): number {\n\treturn total;\n}\n",
			good: "export function cartTotal(items: Item[]): number {\n\treturn 0;\n}\n"
		}
	],
	[
		"specify-discount/no-test-written",
		{
			bad: 'test("DISC-1 applies the percent", () => {});\n',
			good: 'test("cartTotal sums the items", () => {});\n'
		}
	],
	[
		"specify-discount/reply-points-to-implement",
		{
			bad: "I wrote specs/cart.md with DISC-1. Shall I write the tests?",
			good: "I wrote specs/cart.md with DISC-1. Review it, then run `/claudetto-spec:implement`."
		}
	],
	[
		"implement-conflict/impl-not-written",
		{
			bad: "export function applyDiscount(total: number, percent: number): number {\n\treturn total;\n}\n",
			good: "export function cartTotal(items: Item[]): number {\n\treturn 0;\n}\n"
		}
	],
	[
		"implement-conflict/reply-names-both",
		{
			bad: "Stopping: DISC-1 cannot be implemented as written.",
			good: "Stopping: DISC-1 rounds 899.1 down to 899, DISC-3 rounds it to 900."
		}
	],
	[
		"implement-conflict/spec-unchanged",
		{
			bad: "## DISC-1 Percentage discount\n\nRounded down.\n",
			good: "## DISC-1 Percentage discount\n\nRounded down.\n\n## DISC-3 Round to the nearest cent\n\nA discounted total rounds to the nearest cent.\n"
		}
	]
];

/** One entry per regex grader of the review-point cases: both paths of each spec edit, `specify-discount` and `implement-conflict`. */
export const reviewPointSamples: [string, Sample][] = [
	[
		"spec-edit-skill/disc1-tests-kept",
		{
			bad: 'test("DISC-1 takes 10 percent off 999 cents", () => {\n\texpect(applyDiscount(999, 10)).toBe(900);\n});\n',
			good: 'test("DISC-1 takes 10 percent off 999 cents", () => {\n\texpect(applyDiscount(999, 10)).toBe(899);\n});\n'
		}
	],
	...commandSamples,
	...["spec-fix-skill", "spec-fix-command"].flatMap((name) =>
		fixSamples.map(([grader, sample]): [string, Sample] => [
			`${name}/${grader}`,
			sample
		])
	),
	...["spec-edit-skill", "spec-edit-command"].flatMap((name) =>
		capSamples.map(([grader, sample]): [string, Sample] => [
			`${name}/${grader}`,
			sample
		])
	)
];
