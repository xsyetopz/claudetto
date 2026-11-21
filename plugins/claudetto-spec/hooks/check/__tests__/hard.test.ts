import { describe, expect, test } from "claude-code/testing";

import { hardFindings } from "../hard";
import { cleanFixture, plantSkip, report } from "./fixture";

describe("REQ-SPEC-015 hardFindings", () => {
	test("advice fields never block: inflated, uncovered, citation-only and edited tests", () => {
		// Arrange
		const advice = {
			...report(cleanFixture()),
			inflated: [
				{ id: "A-1", file: "specs/a.md", line: 3, sentences: 2, scenarios: 0 }
			],
			uncovered: ["A-2"],
			changedSinceStaged: ["tests/a.test.ts"],
			citedUnasserted: [{ id: "A-1", file: "tests/a.test.ts", line: 1 }]
		};

		// Act
		const found = hardFindings(advice);

		// Assert
		expect(found).toEqual([]);
	});

	test("each blocking field yields one finding with its kind, subject and a message", () => {
		// Arrange
		const fixture = cleanFixture();
		plantSkip(fixture);
		const blocking = {
			...report(fixture),
			malformed: [{ file: "specs/a.md", line: 7, reason: "bad heading" }],
			removedIds: [{ id: "A-1", file: "specs/a.md" }],
			reworded: [{ id: "A-2", file: "specs/a.md", line: 9 }],
			orphans: ["A-9"]
		};

		// Act
		const found = hardFindings(blocking);

		// Assert
		expect(found.map((h) => [h.kind, h.subject])).toEqual([
			["malformed", "specs/a.md:7"],
			["removedId", "A-1"],
			["reworded", "A-2"],
			["tampered", "tests/auth.test.ts"],
			["orphan", "A-9"]
		]);
		expect(found.every((h) => h.message.length > 0)).toBe(true);
	});
});
