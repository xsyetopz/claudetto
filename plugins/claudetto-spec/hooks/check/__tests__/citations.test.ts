import { describe, expect, test } from "claude-code/testing";

import { citedUnasserted } from "../citations";

const IDS = new Set(["AUTH-1", "AUTH-2"]);
const FILE = "tests/auth.test.ts";

describe("REQ-SPEC-013 citation-only tests", () => {
	test("a test block that cites an ID and asserts nothing is listed with its line", () => {
		// Arrange
		const text = `test("AUTH-1 logs in", () => {
	expect(a).toBe(1);
});

test("AUTH-2 locks out", () => {
	login();
});
`;

		// Act
		const found = citedUnasserted(FILE, text, IDS);

		// Assert
		expect(found).toEqual([{ id: "AUTH-2", file: FILE, line: 5 }]);
	});

	test("a citation in a comment inside the block counts for that block", () => {
		// Arrange
		const text = `it("logs in", () => {\n\t// AUTH-1\n\tlogin();\n});\n`;

		// Act
		const found = citedUnasserted(FILE, text, IDS);

		// Assert
		expect(found).toEqual([{ id: "AUTH-1", file: FILE, line: 1 }]);
	});

	test("a describe title citing an ID is no block, and its tests are judged alone", () => {
		// Arrange
		const text = `describe("AUTH-1 login", () => {
	test("works", () => {
		expect(a).toBe(1);
	});
});
`;

		// Act
		const found = citedUnasserted(FILE, text, IDS);

		// Assert
		expect(found).toEqual([]);
	});

	test("Python and Go test functions are blocks, and assert statements count", () => {
		// Arrange
		const py =
			"def test_a():\n    # AUTH-1\n    assert login()\n\ndef test_b():\n    # AUTH-2\n    login()\n";
		const go = "func TestA(t *testing.T) {\n\t// AUTH-1\n\tlogin()\n}\n";

		// Act
		const found = [
			...citedUnasserted("tests/test_a.py", py, IDS),
			...citedUnasserted("tests/a_test.go", go, IDS)
		];

		// Assert
		expect(found.map((f) => [f.file, f.id, f.line])).toEqual([
			["tests/test_a.py", "AUTH-2", 5],
			["tests/a_test.go", "AUTH-1", 1]
		]);
	});

	test("a block whose only assertions compare a literal with itself is listed", () => {
		// Arrange
		const js = `test("AUTH-1 logs in", () => {
	expect(true).toBe(true);
	expect(1).toEqual(1);
	expect(true).toBeTruthy();
});

test("AUTH-2 locks out", () => {
	expect(true).toBe(true);
	expect(locked()).toBe(true);
});
`;
		const py = "def test_a():\n    # AUTH-2\n    assert True\n";

		// Act
		const found = [
			...citedUnasserted(FILE, js, IDS),
			...citedUnasserted("tests/test_a.py", py, IDS)
		];

		// Assert
		expect(found.map((f) => [f.file, f.id, f.line])).toEqual([
			[FILE, "AUTH-1", 1],
			["tests/test_a.py", "AUTH-2", 1]
		]);
	});

	test("an ID no spec defines is not listed", () => {
		// Arrange
		const text = `test("UTF-8 ISO-8601", () => {});`;

		// Act
		const found = citedUnasserted(FILE, text, IDS);

		// Assert
		expect(found).toEqual([]);
	});
});
