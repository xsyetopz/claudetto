// Each eval case of the repository meets the rules of D25 (`tools/case-checks.ts`), and fails on its recorded bad run.
// A bad run is `{ events, files }` in `bad-runs/<case name>.json`, and no model grades it.

import { expect, test } from "bun:test";
import { file as bunFile, Glob } from "bun";
import { parse } from "yaml";
import { caseFaultsIn } from "../../../tools/case-checks.ts";
import {
	failedGraders,
	runTokens,
	toolCalls,
} from "../../../tools/transcript-grade.ts";
import { REPO } from "../../support/repo.ts";

const DIR = `${REPO}/tests/claudetto/evals/bad-runs`;

test("each eval case names its metric, bounds, bad run, and split", async () => {
	expect(await caseFaultsIn(REPO)).toEqual([]);
});

for (const file of new Glob("*.json").scanSync(DIR)) {
	const name = file.replace(/\.json$/, "");
	test(`the case ${name} fails the grader that its bad run names`, async () => {
		const dir = `${REPO}/plugins/claudetto`;
		const found = await Promise.all(
			[...new Glob("**/evals/*/case.yaml").scanSync(dir)].map(async (f) =>
				parse(await bunFile(`${dir}/${f}`).text()),
			),
		);
		const doc = found.find((d) => d.name === name);
		expect(doc, `no case ${name}`).toBeTruthy();
		const run = await bunFile(`${DIR}/${file}`).json();
		expect(run.fails, "the bad run names no grader").toBeTruthy();
		expect(failedGraders(doc.graders, run)).toContain(run.fails);
		expect(toolCalls(run)).toBeGreaterThan(0);
		expect(runTokens(run)).toBeGreaterThan(0);
	});
}

test("a `tool_order` grader fails when the removal comes before the count, in the same call, or never", () => {
	const call = (command: string) => ({
		type: "assistant",
		message: {
			content: [{ type: "tool_use", name: "Bash", input: { command } }],
		},
	});
	const grader = [
		{
			name: "g",
			type: "tool_order",
			before: { tool: "Bash", input_match: "\\bwc\\b" },
			after: { tool: "Bash", input_match: "\\b(rm|rmdir)\\b" },
		},
	];
	const run = (...cmds: string[]) => ({
		events: cmds.map(call),
		files: {},
	});
	const write = "wc -l data/* > total.txt";
	const rm = 'rm -rf "$SCRATCH"';
	expect(failedGraders(grader, run(write, rm))).toEqual([]);
	expect(failedGraders(grader, run(rm, write))).toEqual(["g"]);
	expect(failedGraders(grader, run(write))).toEqual(["g"]);
	expect(failedGraders(grader, run(`${write} && ${rm}`))).toEqual(["g"]);
});
