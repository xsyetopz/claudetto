import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ADR-0193 rule 3: each regex grader of the claudetto-spec eval suite has a
// known-good and a known-bad sample, and the pattern must reject the bad one.

const evalsDir = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto-spec",
	"evals"
);

interface Grader {
	flags: string;
	match: string;
	pattern: string;
	type: string;
}

interface Sample {
	bad: string;
	good: string;
}

function text(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function toGrader(front: unknown): Grader {
	const fields = new Map(Object.entries(front ?? {}));
	return {
		flags: text(fields.get("flags")),
		match: text(fields.get("match")),
		pattern: text(fields.get("pattern")),
		type: text(fields.get("type"))
	};
}

async function readGrader(
	dir: string,
	file: string
): Promise<[string, Grader]> {
	const body = await readFile(join(dir, file), "utf8");
	const front = /^---\n(?<yaml>[\s\S]*?)\n---/u.exec(body)?.groups?.["yaml"];
	return [file.replace(/\.md$/u, ""), toGrader(Bun.YAML.parse(front ?? ""))];
}

async function loadGraders(): Promise<Map<string, Grader>> {
	const entries = await readdir(evalsDir, { withFileTypes: true });
	const cases = entries.filter(
		(entry) => entry.isDirectory() && !entry.name.startsWith(".")
	);
	const perCase = await Promise.all(
		cases.map(async (entry) => {
			const dir = join(evalsDir, entry.name, "graders");
			const names = await readdir(dir);
			const files = names.filter((f) => f.endsWith(".md"));
			const pairs = await Promise.all(files.map((f) => readGrader(dir, f)));
			return pairs.map(([name, grader]): [string, Grader] => [
				`${entry.name}/${name}`,
				grader
			]);
		})
	);
	return new Map(perCase.flat());
}

/** Applies a regex grader the way the docs define `match`: JavaScript regex, only the grader's own flags. */
function passes(grader: Grader, sample: string): boolean {
	const exact = /^count:(?<n>\d+)$/u.exec(grader.match)?.groups?.["n"];
	if (exact !== undefined) {
		const all = new RegExp(grader.pattern, `${grader.flags}g`);
		return [...sample.matchAll(all)].length === Number(exact);
	}
	const found = new RegExp(grader.pattern, grader.flags).test(sample);
	return grader.match === "not_contains" ? !found : found;
}

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
