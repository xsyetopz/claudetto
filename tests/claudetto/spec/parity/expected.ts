// The records that `minispec` gives where it differs from OpenSpec, built from the projection of the OpenSpec record.

import { expect } from "bun:test";
import { field, list, type Obj, obj, type Run } from "./shared.ts";

/** The items of the validation facts of `os`, as objects. */
const itemsOf = (os: Run): Obj[] =>
	list(field(os.facts, "items")).map((i) => obj(i));

/** The record of `minispec` when the archive would refuse a delta: the INFO of OpenSpec is an ERROR, and the item fails. */
export const refused = (os: Run): Run => ({
	...os,
	code: 1,
	facts: {
		items: itemsOf(os).map((i) => ({
			...i,
			valid: false,
			issues: list(field(i, "issues")).map((x) => ({
				...obj(x),
				level: "ERROR",
			})),
		})),
		totals: { items: 1, passed: 0, failed: 1 },
	},
});

/** The record of `minispec` for a change that is valid with no issue, from the record of OpenSpec that has errors. */
export const clean = (os: Run): Run => ({
	...os,
	code: 0,
	facts: {
		items: itemsOf(os).map((i) => ({
			...i,
			valid: true,
			issues: [],
		})),
		totals: { items: 1, passed: 1, failed: 0 },
	},
});

/** The record `os` with each issue of each item changed by `change`. */
export const mapIssues = (
	os: Run,
	change: (issue: unknown) => unknown,
): Run => ({
	...os,
	facts: {
		...obj(os.facts),
		items: itemsOf(os).map((i) => ({
			...i,
			issues: list(field(i, "issues")).map((x) => change(x)),
		})),
	},
});

/** The record of `minispec` for a main spec with a repeated requirement: the ERROR has the path `requirements[1]` and no line. */
export const duplicated = (os: Run): Run =>
	mapIssues(os, () => ({
		level: "ERROR",
		path: "requirements[1]",
		message: 'Duplicate requirement in specification: "Foo"',
	}));

/** The record of `minispec` for a valid change that has the one WARNING with `path` and the word `word` in its message, from the record of OpenSpec that has none. */
export const warned =
	(path: string, word: string) =>
	(os: Run): Run => ({
		...os,
		facts: {
			...obj(os.facts),
			items: itemsOf(os).map((i) => ({
				...i,
				issues: [
					{
						level: "WARNING",
						path,
						message: expect.stringContaining(word),
					},
				],
			})),
		},
	});

/** The tip that OpenSpec adds to an issue message. */
export const TIP = / Tip: .*$/;

/** The artifacts of OpenSpec with the `proposal` that lacks sections as `ready`, and the `design` that needs it as `blocked`. */
export const unfinished = (artifacts: unknown[]) =>
	artifacts.map((item) => {
		const a = obj(item);
		if (field(a, "id") === "proposal") {
			return { ...a, status: "ready" };
		}
		if (field(a, "id") === "design") {
			return { ...a, status: "blocked", missingDeps: ["proposal"] };
		}
		return a;
	});
