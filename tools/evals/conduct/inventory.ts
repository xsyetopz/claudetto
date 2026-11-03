// The conduct spec names the rules; this module names the case of each, or the repository test that settles it.

import { file as bunFile } from "bun";
import { caseFaults, type RuleCase } from "../main-rules.ts";
import { ACTION_CASES } from "./actions.ts";
import { INQUIRY_CASES } from "./inquiry.ts";
import { REPLY_CASES } from "./replies.ts";

export interface ConductCase extends RuleCase {
	/** The `### Requirement:` heading of the conduct spec that the case scores. */
	readonly requirement: string;
	/** The prompt file, under the plugin root, whose section holds the rule. */
	readonly file: string;
}

export const CONDUCT_CASES: readonly ConductCase[] = [
	...INQUIRY_CASES,
	...ACTION_CASES,
	...REPLY_CASES,
];

/** These rules are about the text of a file, which a test reads; no model run can add to that. */
export const SETTLED_BY_TEST: Readonly<Record<string, string>> = {
	"Each Rule Has an Eval Case": "tools/evals/__tests__/conduct.spec.ts",
};

const REQUIREMENT = /^### Requirement: (.+)$/gm;

export const requirementsOf = (spec: string): readonly string[] =>
	[...spec.matchAll(REQUIREMENT)].map((match) => match[1] ?? "");

const sectionFaults = async (
	cases: readonly ConductCase[],
	root: string,
): Promise<readonly string[]> => {
	const files = [...new Set(cases.map((row) => row.file))];
	const faults = await Promise.all(
		files.map(async (path) => {
			const group = cases.filter((row) => row.file === path);
			if (!(await bunFile(`${root}/${path}`).exists())) {
				return group.map(
					(row) => `${row.codes.join(", ")}: ${path} does not exist`,
				);
			}
			return caseFaults(group, path, root);
		}),
	);
	return faults.flat();
};

/** A rule with neither a case nor a test is a rule nothing scores. */
export const conductFaults = async (
	spec: string,
	cases: readonly ConductCase[] = CONDUCT_CASES,
	settled: Readonly<Record<string, string>> = SETTLED_BY_TEST,
	root = "plugins/claudetto",
): Promise<readonly string[]> => {
	const rules = requirementsOf(spec);
	const uncovered = rules
		.filter(
			(rule) =>
				settled[rule] === undefined &&
				!cases.some((row) => row.requirement === rule),
		)
		.map((rule) => `${rule}: no eval case`);
	const stray = cases
		.filter((row) => !rules.includes(row.requirement))
		.map(
			(row) =>
				`${row.codes.join(", ")}: the spec has no rule "${row.requirement}"`,
		);
	return [...uncovered, ...stray, ...(await sectionFaults(cases, root))];
};
