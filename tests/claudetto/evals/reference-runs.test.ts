// Each eval case that has a reference run passes every check without a model on it,
// and a run that does nothing fails at least one such check.
// A reference run is `{ events, files }` in `reference-runs/<case name>.json`, as a bad run is, and no model grades it.
// The `llm` graders are the only graders that this test skips.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, Glob } from "bun";
import { parse } from "yaml";
import {
	failedGraders,
	type Grader,
	type Transcript,
} from "../../../tools/transcript-grade.ts";
import { runScaffold } from "../../support/eval-patterns.ts";
import { REPO } from "../../support/repo.ts";

/** The cases of the `prompt` rules: each has a tag `set:NAME`. */
const EVALS = `${REPO}/plugins/claudetto/evals`;
const DIR = `${REPO}/tests/claudetto/evals/reference-runs`;

interface Case {
	name: string;
	tags?: string[];
	graders: Grader[];
	dir: string;
}

const cases: Case[] = (
	await Promise.all(
		[...new Glob("*/case.yaml").scanSync(EVALS)].map(async (f) => {
			const doc: Case = parse(await bunFile(`${EVALS}/${f}`).text());
			return { ...doc, dir: path.dirname(`${EVALS}/${f}`) };
		}),
	)
).filter((c) => c.tags?.some((t) => t.startsWith("set:")));

/** The graders that run without a model. */
const offline = (c: Case): Grader[] =>
	c.graders.filter((g) => g.type !== "llm");

/**
 * The cases where a run that does nothing passes each check without a model, so only the judge tells it apart.
 * `repeat-no-reason`, `false-alarm-sum`, and `blind-mirror-deletes-uploads` ask for no change, and their checks without a model only guard the files.
 * The `-hard` version of `false-alarm-sum` adds `tests-run`, which a no-op run fails.
 */
const NO_OP_PASSES = [
	"repeat-no-reason",
	"repeat-no-reason-hard",
	"false-alarm-sum",
	"blind-mirror-deletes-uploads",
];

test("the eval folder holds the cases that this file reads", () => {
	expect(cases.length).toBeGreaterThanOrEqual(22);
});

const hasRun = await Promise.all(
	cases.map((c) => bunFile(`${DIR}/${c.name}.json`).exists()),
);

for (const [i, c] of cases.entries()) {
	const file = bunFile(`${DIR}/${c.name}.json`);
	if (hasRun[i]) {
		test(`the reference run of ${c.name} passes each check without a model`, async () => {
			const run: Transcript = await file.json();
			expect(run.events.length).toBeGreaterThan(0);
			expect(failedGraders(offline(c), run)).toEqual([]);
		});
	}

	test(`a run of ${c.name} that does nothing ${NO_OP_PASSES.includes(c.name) ? "passes each check without a model, so only the judge tells it apart" : "fails a check without a model"}`, async () => {
		const files: Record<string, string> = {};
		// A case with no `scaffold.sh` starts in an empty folder.
		if (await bunFile(path.join(c.dir, "scaffold.sh")).exists()) {
			const root = await runScaffold(c.dir);
			const found = await Array.fromAsync(
				new Glob("**/*").scan({ cwd: root, dot: true }),
			);
			const texts = await Promise.all(
				found.map((f) => bunFile(path.join(root, f)).text()),
			);
			found.forEach((name, n) => {
				files[name] = texts[n] ?? "";
			});
		}
		const noop: Transcript = {
			events: [
				{
					type: "assistant",
					message: { content: [{ type: "text", text: "Done." }] },
				},
				{ type: "result", result: "Done." },
			],
			files,
		};
		const failed = failedGraders(offline(c), noop);
		expect(failed.length === 0, JSON.stringify(failed)).toBe(
			NO_OP_PASSES.includes(c.name),
		);
	});
}
