// Shared helpers of `graders*.test.ts`: the cases of `plugins/claudetto/evals/*/case.yaml` and the grader lookups.

import path from "node:path";
import { file as bunFile } from "bun";
import { parse } from "yaml";
import { PLUGINS, walk } from "../../../support/repo.ts";

export const EVALS = path.join(PLUGINS, "claudetto/evals");

/** A grader of a case file, as the YAML holds it. */
export interface Grader {
	name: string;
	type: string;
	target?: string | { source: string; path: string };
	pattern?: string;
	flags?: string;
	match?: string;
	focus?: string;
	criteria?: string;
	tool?: string;
	input_match?: string;
	max?: number;
	min?: number;
}
/** A case file, as the YAML holds it, and `dir`, its folder, whose name can differ from `name`. */
export interface Case {
	name: string;
	graders: Grader[];
	dir: string;
}

export const cases: Record<string, Case> = Object.fromEntries(
	await Promise.all(
		(await walk(EVALS, { keep: (f) => path.basename(f) === "case.yaml" })).map(
			async (file) => {
				const doc: Case = parse(await bunFile(file).text());
				return [doc.name, { ...doc, dir: path.dirname(file) }] as const;
			},
		),
	),
);

/** The case `caseName`. */
export const caseOf = (caseName: string): Case => {
	const found = cases[caseName];
	if (!found) {
		throw new Error(`no case ${caseName}`);
	}
	return found;
};

/** The folder of the case `caseName`. */
export const dirOf = (caseName: string): string => caseOf(caseName).dir;

/** The grader `name` of the case `caseName`. */
export const grader = (caseName: string, name: string): Grader => {
	const found = caseOf(caseName).graders.find((g) => g.name === name);
	if (!found) {
		throw new Error(`${caseName}: no grader ${name}`);
	}
	return found;
};
/** The regex of a `regex` grader or the `input_match` of a `tool_used` grader. */
export const regexOf = (g: Grader) =>
	new RegExp(g.pattern ?? g.input_match ?? "", g.flags ?? "");
/** Whether the grader passes `text`: a `not_contains` grader passes when the regex finds nothing. */
export const passes = (g: Grader, text: string) =>
	regexOf(g).test(text) !== (g.match === "not_contains");
/** A `Bash` call as the engine matches it: the JSON of the input, with `command` first and then the `description` that most calls carry. */
export const asJson = (command: string, description = "Run the step") =>
	JSON.stringify({ command, description });
