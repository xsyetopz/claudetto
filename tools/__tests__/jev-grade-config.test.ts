import { expect, test } from "bun:test";
import { join } from "node:path";

import { loadConfig, validateConfig } from "../jev-grade/config";

const valid = {
	facts: "the check exits 1",
	questions: { a: { instructions: "Is it so?" } }
};

test("a minimal config gets weight 1 and a facts list is accepted", () => {
	// Act
	const config = validateConfig({ ...valid, facts: ["one", "two"] });

	// Assert
	expect(config).toEqual({
		facts: ["one", "two"],
		questions: { a: { instructions: "Is it so?", weight: 1 } }
	});
});

test("an unknown top-level key fails", () => {
	expect(validateConfig({ ...valid, extra: 1 })).toBe(
		'jev.yaml: unknown key "extra"'
	);
});

test("an unknown question key fails", () => {
	expect(
		validateConfig({
			...valid,
			questions: { a: { instructions: "x", type: "noul" } }
		})
	).toBe('questions.a: unknown key "type"');
});

test("criteria need both true and false, and nothing else", () => {
	expect(
		validateConfig({
			...valid,
			questions: { a: { instructions: "x", criteria: { true: "y" } } }
		})
	).toContain("needs non-empty text for true and false");
	expect(
		validateConfig({
			...valid,
			questions: {
				a: {
					instructions: "x",
					criteria: { true: "y", false: "z", maybe: "w" }
				}
			}
		})
	).toContain('unknown key "maybe"');
});

test("bad facts, missing instructions, bad weights and no questions fail", () => {
	expect(validateConfig({ ...valid, facts: [] })).toContain("facts");
	expect(validateConfig({ ...valid, facts: undefined })).toContain("facts");
	expect(validateConfig({ ...valid, questions: { a: {} } })).toContain(
		"instructions"
	);
	expect(
		validateConfig({
			...valid,
			questions: { a: { instructions: "x", weight: -1 } }
		})
	).toContain("weight");
	expect(
		validateConfig({
			...valid,
			questions: { a: { instructions: "x", weight: 0 } }
		})
	).toContain("above 0");
	expect(validateConfig({ ...valid, questions: {} })).toContain("questions");
	expect(validateConfig("text")).toContain("mapping");
});

test("each shipped jev.yaml parses with Bun's YAML and holds 3 to 6 questions", async () => {
	// Act
	const configs = await Promise.all(
		["background-check-fails", "trivial-typo", "rename-across-files"].map(
			(name) =>
				loadConfig(
					join(
						import.meta.dir,
						"../../plugins/claudetto/evals",
						name,
						"jev.yaml"
					)
				)
		)
	);

	// Assert
	for (const config of configs) {
		const count = Object.keys(config?.questions ?? {}).length;
		expect(count).toBeGreaterThanOrEqual(3);
		expect(count).toBeLessThanOrEqual(6);
	}
});

test("loadConfig returns undefined for an absent file and throws on a bad one", async () => {
	expect(await loadConfig("/nonexistent/jev.yaml")).toBeUndefined();
	const path = join(process.env["TMPDIR"] ?? "/tmp", "jev-bad.yaml");
	await Bun.write(
		path,
		"facts: x\nquestions:\n  a:\n    instructions: y\n    oops: 1\n"
	);
	expect(loadConfig(path)).rejects.toThrow("unknown key");
});
