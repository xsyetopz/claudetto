import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// ADR-0193 rule 3: each regex grader of the claudetto-spec eval suite has a
// known-good and a known-bad sample, and the pattern must reject the bad one.

import {
	evalsDir,
	loadGraders,
	passes,
	type Sample
} from "./spec-eval-graders";

const featureSamples: [string, Sample][] = [
	[
		"spec-file-created",
		{
			bad: "src/cart.test.ts\nsrc/discount.ts\n",
			good: "src/cart.test.ts\n/work/specs/cart.md\n"
		}
	],
	[
		"spec-id-heading-written",
		{
			bad: String.raw`{"name":"Write","input":{"file_path":"specs/cart.md","content":"# Cart\n\n## Discount\n\nSee DISC-1."}}`,
			good: String.raw`{"name":"Write","input":{"file_path":"specs/cart.md","content":"# Cart\n\n## DISC-1 Percentage discount\n\nThe total drops."}}`
		}
	],
	[
		"test-cites-id",
		{
			bad: 'test("applies the percent", () => {\n\t// DISC-1\n});\n',
			good: 'test("DISC-1 applies the percent", () => {\n});\n'
		}
	]
];

// Trace fragments shaped like `claude plugin eval` trace lines (2.1.330). The skill
// text itself says "`git add` the test files", so only a Bash tool input may count.
const skillDecoy = String.raw`{"type":"tool_result","content":"Launching skill: claudetto-spec:spec\n4. Red: run them failing, then git add the test files."}`;
const stageTests = String.raw`{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"bun test src/cart.test.ts; git add src/cart.test.ts","description":"Stage red tests"}}`;
const heredocImpl = String.raw`{"type":"tool_use","id":"t2","name":"Bash","input":{"command":"cat >> src/cart.ts <<'EOF'\nexport function applyDiscount() {}\nEOF"}}`;
const editImpl = String.raw`{"type":"tool_use","id":"t3","name":"Edit","input":{"replace_all":false,"file_path":"/private/tmp/e-X/home/cwd/src/cart.ts","old_string":"a","new_string":"b"}}`;
const writeTest = String.raw`{"type":"tool_use","id":"t4","name":"Write","input":{"file_path":"/private/tmp/e-X/home/cwd/src/cart.test.ts","content":"test(\"DISC-1\", () => {});"}}`;
const sedImpl = String.raw`{"type":"tool_use","id":"t5","name":"Bash","input":{"command":"sed -i '' 's/a/b/' src/cart.ts"}}`;

/** Traces that write `src/cart.ts` before the tests are staged; `staged-before-impl` must fail each. */
const unstagedImplTraces = [
	[skillDecoy, writeTest, editImpl, stageTests],
	[skillDecoy, writeTest, heredocImpl, stageTests],
	[skillDecoy, writeTest, sedImpl],
	[writeTest, editImpl]
].map((lines) => lines.join("\n"));

const v2Samples: [string, Sample][] = [
	[
		"impl-written",
		{
			bad: "export function cartTotal(items: Item[]): number {\n\treturn 0;\n}\n",
			good: "export function applyCoupon(total: number, pct: number): number {\n\treturn total;\n}\n"
		}
	],
	[
		"staged-before-impl",
		{
			bad: unstagedImplTraces[1] ?? "",
			good: [skillDecoy, writeTest, stageTests, heredocImpl, editImpl].join(
				"\n"
			)
		}
	]
];

// Bun prints its summary either mid-output or at the start of a tool result string.
const redRun = String.raw`{"type":"tool_result","content":"(fail) DISC-1\n\n 0 pass\n 1 fail\n 1 error\nRan 1 test"}`;
const greenRun = String.raw`{"type":"tool_result","content":" 6 pass\n 0 fail\n 11 expect() calls\nRan 6 tests"}`;

const v3Samples: [string, Sample][] = [
	[
		"tests-pass-at-end",
		{
			bad: [redRun, greenRun, redRun].join("\n"),
			good: [redRun, greenRun].join("\n")
		}
	]
];

const trivialSpecs: Sample = { bad: "specs/cart.md\n", good: "README.md\n" };

const samples = new Map<string, Sample>([
	[
		"ambiguous-headless/reply-states-assumption",
		{
			bad: "Done: totalWithTax is in src/cart.ts.",
			good: "I assumed the rate is a percent and rounded half up."
		}
	],
	[
		"ambiguous-headless/spec-has-open-line",
		{
			bad: String.raw`{"name":"Write","input":{"file_path":"specs/cart.md","content":"## CART-2 Tax\n\nThe total includes tax.\nReopened later."}}`,
			good: String.raw`{"name":"Write","input":{"file_path":"specs/cart.md","content":"## CART-2 Tax\n\nThe total includes tax.\n\nOpen: rounding mode is unspecified."}}`
		}
	],
	[
		"contradiction/impl-not-bent",
		{
			bad: "\treturn acc;\n",
			good: "\treturn Math.max(0, acc);\n"
		}
	],
	[
		"contradiction/reply-names-id",
		{
			bad: "I changed cartTotal so it can return negative totals.",
			good: "Stopping: this conflicts with CART-1, totals are never negative."
		}
	],
	[
		"contradiction/spec-unchanged",
		{
			bad: "## CART-1 Totals may be negative\n",
			good: "# Cart\n\n## CART-1 Totals are never negative\n"
		}
	],
	[
		"contradiction/test-unchanged",
		{
			bad: 'test("CART-1 total is never negative", () => {\n\texpect(cartTotal([{ price: -5, qty: 1 }])).toBe(-5);\n});\n',
			good: 'test("CART-1 total is never negative", () => {\n\texpect(cartTotal([{ price: -5, qty: 1 }])).toBe(0);\n});\n'
		}
	],
	[
		"trivial-rename/new-name-used",
		{ bad: "\tlet acc = 0;\n", good: "\tlet subtotal = 0;\n" }
	],
	["trivial-rename/no-specs-created", trivialSpecs],
	[
		"trivial-rename/old-name-gone",
		{ bad: "\tacc += item.price;\n", good: "\tsubtotal += item.price;\n" }
	],
	[
		"trivial-typo/fix-written",
		{
			bad: "Customers recieve one total for all items.",
			good: "Customers receive one total for all items."
		}
	],
	["trivial-typo/no-specs-created", trivialSpecs],
	[
		"trivial-typo/typo-fixed",
		{
			bad: "Customers recieve one total.",
			good: "Customers receive one total."
		}
	],
	...["feature-discount", "feature-discount-p2"].flatMap((name) =>
		featureSamples.map(([grader, sample]): [string, Sample] => [
			`${name}/${grader}`,
			sample
		])
	),
	...["feature-discount-v2", "feature-discount-p2-v2"].flatMap((name) =>
		[...featureSamples, ...v2Samples].map(
			([grader, sample]): [string, Sample] => [`${name}/${grader}`, sample]
		)
	),
	...["feature-discount-v3", "feature-discount-p2-v3"].flatMap((name) =>
		[...featureSamples, ...v2Samples, ...v3Samples].map(
			([grader, sample]): [string, Sample] => [`${name}/${grader}`, sample]
		)
	)
]);

const graders = await loadGraders();
const regexGraders = [...graders].filter(([, g]) => g.type === "regex");
const withSamples = regexGraders.flatMap(([key, grader]) => {
	const sample = samples.get(key);
	return sample === undefined ? [] : [{ grader, key, sample }];
});

test("every regex grader has a sample and every sample has a grader", () => {
	// Arrange
	const graderKeys = regexGraders.map(([key]) => key).toSorted();
	// Act
	const sampleKeys = [...samples.keys()].toSorted();
	// Assert
	expect(sampleKeys).toEqual(graderKeys);
});

test.each(withSamples)("$key accepts its good sample", ({ grader, sample }) => {
	// Arrange
	const input = sample.good;
	// Act
	const result = passes(grader, input);
	// Assert
	expect(result).toBe(true);
});

test.each(withSamples)("$key rejects its bad sample", ({ grader, sample }) => {
	// Arrange
	const input = sample.bad;
	// Act
	const result = passes(grader, input);
	// Assert
	expect(result).toBe(false);
});

test.each(unstagedImplTraces)(
	"staged-before-impl rejects an implementation written before staging: %#",
	(trace) => {
		// Arrange
		const grader = graders.get("feature-discount-v2/staged-before-impl");
		// Act
		const result = grader === undefined ? true : passes(grader, trace);
		// Assert
		expect(result).toBe(false);
	}
);

test.each([
	["feature-discount-v2", "feature-discount-p2-v2"],
	["feature-discount-v3", "feature-discount-p2-v3"]
])("the phrasings %s and %s share their graders", async (first, second) => {
	// Arrange
	const pair = [first, second];
	// Act
	const listings = await Promise.all(
		pair.map(async (d) => {
			const dir = join(evalsDir, d, "graders");
			const listed = await readdir(dir);
			const names = listed.toSorted();
			return Promise.all(names.map((n) => readFile(join(dir, n), "utf8")));
		})
	);
	// Assert
	expect(listings[0]).toEqual(listings[1]);
});

test("the contradiction scaffold writes the exact text the unchanged-test grader expects", async () => {
	// Arrange
	const dir = await mkdtemp(join(tmpdir(), "spec-eval-"));
	const script = join(evalsDir, "contradiction", "scaffold.sh");
	const grader = graders.get("contradiction/test-unchanged");
	// Act
	const run = Bun.spawn(["bash", script], {
		cwd: dir,
		env: { ...process.env, HOME: dir },
		stderr: "pipe",
		stdout: "pipe"
	});
	const exitCode = await run.exited;
	const written = await readFile(join(dir, "src", "cart.test.ts"), "utf8");
	// Assert
	expect(exitCode).toBe(0);
	expect(grader === undefined ? false : passes(grader, written)).toBe(true);
});

test("the shared scaffold is identical in every case that uses it", async () => {
	// Arrange
	const names = [
		"ambiguous-headless",
		"feature-discount",
		"feature-discount-p2",
		"feature-discount-v2",
		"feature-discount-p2-v2",
		"feature-discount-v3",
		"feature-discount-p2-v3",
		"trivial-rename",
		"trivial-typo"
	];
	// Act
	const texts = await Promise.all(
		names.map((n) => readFile(join(evalsDir, n, "scaffold.sh"), "utf8"))
	);
	// Assert
	expect(new Set(texts).size).toBe(1);
});
