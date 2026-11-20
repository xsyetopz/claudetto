import { describe, expect, test } from "claude-code/testing";

import { isTestFile } from "../paths";
import { checkSpecs, parseSpec } from "../spec";

const AUTH = `# Auth

## AUTH-1 Login with password

A user with valid credentials receives a session.

- Given a registered user
- When the user posts the right password
- Then a session cookie is set

## AUTH-2 Lockout

Five failed logins lock the account.

Open: how long does the lock last?

Given a user with four failures
When a fifth fails
Then the account is locked
`;

const BILLING = `# Billing

## BILL-1 Invoice total

An invoice sums its line items.

## Bill 2 bad heading

Text.
`;

const LISTING = [
	"specs/auth.md",
	"specs/billing.md",
	"src/auth.test.ts",
	"src/auth.ts",
	"tests/billing_test.py"
].join("\n");

const texts = (extra: Record<string, string> = {}) =>
	new Map(
		Object.entries({
			"specs/auth.md": AUTH,
			"specs/billing.md": BILLING,
			"src/auth.test.ts":
				'test("AUTH-1 logs in", () => {}); // UTF-8, ISO-8601',
			"tests/billing_test.py": "def test_x(): pass",
			...extra
		})
	);

describe("REQ-SPEC-001 parsing", () => {
	test("a two-capability fixture yields every ID, title, scenario count and open question", () => {
		// Arrange
		const input = { listing: LISTING, diff: "", texts: texts() };

		// Act
		const { requirements } = checkSpecs(input);

		// Assert
		expect(
			requirements.map((r) => [r.id, r.title, r.file, r.scenarios, r.open])
		).toEqual([
			["AUTH-1", "Login with password", "specs/auth.md", 1, []],
			[
				"AUTH-2",
				"Lockout",
				"specs/auth.md",
				1,
				["how long does the lock last?"]
			],
			["BILL-1", "Invoice total", "specs/billing.md", 0, []]
		]);
	});

	test("a malformed heading is reported with its file and line", () => {
		// Arrange
		const input = { listing: LISTING, diff: "", texts: texts() };

		// Act
		const { malformed } = checkSpecs(input);

		// Assert
		expect(malformed.map((m) => [m.file, m.line])).toEqual([
			["specs/billing.md", 7]
		]);
	});
});

describe("REQ-SPEC-002 inflation", () => {
	test("two behaviour sentences or four scenarios list the requirement under inflated", () => {
		// Arrange
		const scenario = "Given a\nWhen b\nThen c\n";
		const text = `# X\n\n## X-1 Two\n\nIt does a. It does b.\n\n## X-2 Four\n\nIt does a.\n\n${scenario}${scenario}${scenario}${scenario}\n## X-3 Fine\n\nIt does e.g. a.\n`;

		// Act
		const { inflated } = parseSpec("specs/x.md", text);

		// Assert
		expect(inflated.map((i) => i.id)).toEqual(["X-1", "X-2"]);
	});
});

describe("REQ-SPEC-003 coverage", () => {
	test("an uncited requirement is uncovered and a cited undefined ID of a spec prefix is an orphan", () => {
		// Arrange
		const input = {
			listing: LISTING,
			diff: "",
			texts: texts({
				"src/auth.test.ts": 'test("AUTH-1 AUTH-9 UTF-8 ISO-8601", () => {})'
			})
		};

		// Act
		const { uncovered, orphans } = checkSpecs(input);

		// Assert
		expect({ uncovered, orphans }).toEqual({
			uncovered: ["AUTH-2", "BILL-1"],
			orphans: ["AUTH-9"]
		});
	});
});

describe("REQ-SPEC-004 red checkpoint", () => {
	test("an edited test file is listed and a non-test change is not", () => {
		// Arrange
		const input = {
			listing: LISTING,
			diff: "src/auth.test.ts\nsrc/auth.ts\n",
			texts: texts()
		};

		// Act
		const { changedSinceStaged } = checkSpecs(input);

		// Assert
		expect(changedSinceStaged).toEqual(["src/auth.test.ts"]);
	});

	test("test file paths follow the known conventions", () => {
		// Arrange
		const paths = [
			"a.test.ts",
			"a.spec.js",
			"a_test.go",
			"test_a.py",
			"x/__tests__/a.ts",
			"test/a.rb",
			"src/a.ts"
		];

		// Act
		const flags = paths.map((p) => isTestFile(p));

		// Assert
		expect(flags).toEqual([true, true, true, true, true, true, false]);
	});
});
