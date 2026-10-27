// The helpers that the tests of `minispec` share: a project with a change, a delta, and the counts that `show` gives.

import { access } from "node:fs/promises";
import path from "node:path";
import { write } from "bun";
import { minispec, tmpEmpty } from "../../support/openspec.ts";
import { walk } from "../../support/repo.ts";

export const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

/** Runs `minispec new change name` on `root`, and throws when it exits not 0. */
export const newChange = async (root: string, name: string): Promise<void> => {
	const run = await minispec(root, ["new", "change", name]);
	if (run.code !== 0) {
		throw new Error(`\`new change ${name}\` exited ${run.code}: ${run.out}`);
	}
};

export const DELTA = `## Purpose

The capability x does a thing for the tests of MiniSpec.

## ADDED Requirements

### Requirement: A

The system SHALL do A.

#### Scenario: A Happens

- **WHEN** a condition holds
- **THEN** A follows
`;

/** A fresh project with the change `c` of the preset `story` and the delta `specs/x/spec.md`. */
export const withDelta = async (delta = DELTA): Promise<string> => {
	const root = await tmpEmpty("minispec");
	await newChange(root, "c");
	await write(path.join(root, "openspec/changes/c/specs/x/spec.md"), delta);
	return root;
};
export const filesOf = async (root: string): Promise<string[]> =>
	(await walk(root)).map((f) => path.relative(root, f));

/** The texts of the added requirements that `show --deltas-only` reads from the delta of the change `c`. */
export const addedTexts = async (root: string): Promise<string[]> => {
	const run = await minispec(root, ["show", "c", "--json", "--deltas-only"]);
	if (run.code !== 0) {
		throw new Error(`\`show\` exited ${run.code}: ${run.out}`);
	}
	return JSON.parse(run.out)
		.deltas.filter((d: { operation: string }) => d.operation === "ADDED")
		.map((d: { requirement: { text: string } }) => d.requirement.text);
};

/** A main spec `x` with `before`, then `### Requirement: B`, and the count that `show` gives. */
export const countWith = async (before: string): Promise<number> => {
	const root = await tmpEmpty("minispec-indent");
	await write(
		path.join(root, "openspec/specs/x/spec.md"),
		`## Purpose\n\nThe capability x does a thing for the tests of MiniSpec.\n\n## Requirements\n\n### Requirement: A\n\nThe system SHALL do A.\n\n${before}\n\n### Requirement: B\n\nThe system SHALL do B.\n`,
	);
	return JSON.parse((await minispec(root, ["show", "x", "--json"])).out)
		.requirementCount;
};
