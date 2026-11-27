import { describe, expect, test } from "claude-code/testing";

import { hardFindings } from "../hard";
import type { Report } from "../spec";
import {
	cleanFixture,
	type Fixture,
	plantCitationOnly,
	plantDeletedTest,
	plantInflated,
	plantOrphan,
	plantRemovedAssertion,
	plantRemovedId,
	plantReworded,
	plantSkip,
	report,
	SPEC,
	TEST
} from "./fixture";

const FINDING_FIELDS = [
	"malformed",
	"inflated",
	"uncovered",
	"orphans",
	"removedIds",
	"reworded",
	"changedSinceStaged",
	"tampered",
	"citedUnasserted"
] as const;

const faulted = (plant: (f: Fixture) => void): Report => {
	const f = cleanFixture();
	plant(f);
	return report(f);
};

interface Case {
	fault: string;
	plant: (f: Fixture) => void;
	field: (typeof FINDING_FIELDS)[number];
	expected: unknown[];
	hard: string[];
}

const CASES: Case[] = [
	{
		fault: "a deleted staged test",
		plant: plantDeletedTest,
		field: "tampered",
		expected: [
			{ file: TEST, deleted: true, addedMarkers: [], assertions: null }
		],
		hard: ["tampered"]
	},
	{
		fault: "an added skip marker",
		plant: plantSkip,
		field: "tampered",
		expected: [
			{ file: TEST, deleted: false, addedMarkers: [".skip("], assertions: null }
		],
		hard: ["tampered"]
	},
	{
		fault: "a removed assertion",
		plant: plantRemovedAssertion,
		field: "tampered",
		expected: [
			{
				file: TEST,
				deleted: false,
				addedMarkers: [],
				assertions: { before: 3, after: 2 }
			}
		],
		hard: ["tampered"]
	},
	{
		fault: "a citation-only test",
		plant: plantCitationOnly,
		field: "citedUnasserted",
		expected: [{ id: "AUTH-1", file: TEST, line: 10 }],
		hard: []
	},
	{
		fault: "an orphan ID",
		plant: plantOrphan,
		field: "orphans",
		expected: ["AUTH-9"],
		hard: ["orphan"]
	},
	{
		fault: "an inflated requirement",
		plant: plantInflated,
		field: "inflated",
		expected: [
			{ id: "AUTH-2", file: SPEC, line: 11, sentences: 2, scenarios: 0 }
		],
		hard: []
	},
	{
		fault: "a removed ID",
		plant: plantRemovedId,
		field: "removedIds",
		expected: [{ id: "AUTH-3", file: SPEC }],
		hard: []
	},
	{
		fault: "a reworded requirement",
		plant: plantReworded,
		field: "reworded",
		expected: [{ id: "AUTH-2", file: SPEC, line: 11 }],
		hard: []
	}
];

describe("SPEC-014 fault injection", () => {
	test("the clean fixture reports no finding in any field", () => {
		// Arrange
		const fixture = cleanFixture();

		// Act
		const clean = report(fixture);

		// Assert
		expect(
			Object.fromEntries(FINDING_FIELDS.map((k) => [k, clean[k]]))
		).toEqual(Object.fromEntries(FINDING_FIELDS.map((k) => [k, []])));
		expect(hardFindings(clean)).toEqual([]);
	});

	for (const c of CASES) {
		test(`${c.fault} is reported under ${c.field}, and only there`, () => {
			// Arrange
			const others = FINDING_FIELDS.filter((k) => k !== c.field);

			// Act
			const found = faulted(c.plant);

			// Assert
			expect(found[c.field]).toEqual(c.expected);
			expect(
				others.filter((k) => found[k].length > 0 && k !== "changedSinceStaged")
			).toEqual(c.fault === "a deleted staged test" ? ["uncovered"] : []);
			expect(hardFindings(found).map((h) => h.kind)).toEqual(c.hard);
		});
	}
});
