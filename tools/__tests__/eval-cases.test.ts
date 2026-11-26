import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// ADR-0193: each regex grader has a known-good and a known-bad sample and must accept the first
// and reject the second (rule 3), no case is graded by an `llm` grader alone (rule 2), each suite
// has one canary (rule 5), and no case name carries a version suffix (rule 6).
import { CLAUDETTO_SAMPLES } from "./claudetto-eval-samples";
import { type Samples, scaffoldFileCases, verdicts } from "./eval-case-samples";
import { loadGraders } from "./spec-eval-graders";
import { SPEC_SAMPLES } from "./spec-eval-samples";

const plugins = join(import.meta.dir, "..", "..", "plugins");

const SUITES: readonly {
	dir: string;
	name: string;
	samples: Readonly<Record<string, Samples>>;
}[] = [
	{
		dir: join(plugins, "claudetto", "evals"),
		name: "claudetto",
		samples: CLAUDETTO_SAMPLES
	},
	{
		dir: join(plugins, "claudetto-spec", "evals"),
		name: "claudetto-spec",
		samples: SPEC_SAMPLES
	}
];

async function caseTags(dir: string): Promise<Map<string, string[]>> {
	const entries = await readdir(dir, { withFileTypes: true });
	const names = entries.filter((e) => e.isDirectory()).map((e) => e.name);
	const texts = await Promise.all(
		names.map(async (name) => {
			const file = Bun.file(join(dir, name, "case.yaml"));
			const found = await file.exists();
			return found ? file.text() : undefined;
		})
	);
	const tags = new Map<string, string[]>();
	for (const [index, text] of texts.entries()) {
		if (text !== undefined) {
			const parsed: unknown = Bun.YAML.parse(text);
			const list: unknown = new Map(Object.entries(parsed ?? {})).get("tags");
			tags.set(names[index] ?? "", Array.isArray(list) ? list.map(String) : []);
		}
	}
	return tags;
}

const loaded = await Promise.all(
	SUITES.map(async (suite) => {
		await scaffoldFileCases(suite.dir, suite.samples);
		return {
			graders: await loadGraders(suite.dir),
			suite,
			tags: await caseTags(suite.dir)
		};
	})
);

for (const { graders, suite, tags } of loaded) {
	const regex = [...graders].filter(([, grader]) => grader.type === "regex");

	test(`${suite.name}: every regex grader has samples, and no sample lacks a grader`, () => {
		expect(regex.map(([id]) => id).toSorted()).toEqual(
			Object.keys(suite.samples).toSorted()
		);
	});

	test.each(regex)(
		`${suite.name}/%s accepts its good samples and rejects its bad ones`,
		async (id, grader) => {
			// Act
			const result = await verdicts(
				suite.dir,
				id,
				grader,
				suite.samples[id] ?? {}
			);

			// Assert
			expect(result.good.length).toBeGreaterThan(0);
			expect(result.bad.length).toBeGreaterThan(0);
			expect(result).toEqual({
				bad: result.bad.map(() => false),
				good: result.good.map(() => true)
			});
		}
	);

	test(`${suite.name}: no case is graded by an llm grader alone`, () => {
		const judged = new Set<string>();
		for (const [id, grader] of graders) {
			if (grader.type !== "llm") {
				judged.add(id.slice(0, id.indexOf("/")));
			}
		}
		expect([...judged].toSorted()).toEqual([...tags.keys()].toSorted());
	});

	test(`${suite.name}: one case is the canary`, () => {
		const canaries = [...tags].filter(([, list]) => list.includes("canary"));
		expect(canaries).toHaveLength(1);
	});

	test(`${suite.name}: no case name carries a version suffix`, () => {
		expect([...tags.keys()].filter((name) => /-v\d+$/u.test(name))).toEqual([]);
	});
}
