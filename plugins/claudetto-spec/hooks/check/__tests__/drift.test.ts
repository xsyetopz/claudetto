import { describe, expect, test } from "claude-code/testing";

import { checkSpecs } from "../spec";

const spec = (...blocks: string[]) => `# Auth\n\n${blocks.join("\n")}`;
const LOGIN = "## AUTH-1 Login\n\nA valid user receives a session.\n";
const LOCK = "## AUTH-2 Lockout\n\nFive failures lock the account.\n";

const run = (now: string, head?: string, extra = {}) =>
	checkSpecs({
		listing: "specs/auth.md\n",
		diff: "",
		texts: new Map([["specs/auth.md", now]]),
		head: new Map(head === undefined ? [] : [["specs/auth.md", head]]),
		...extra
	});

describe("REQ-SPEC-011 spec drift against HEAD", () => {
	test("an ID in HEAD that the work tree dropped is a removed ID", () => {
		// Arrange
		const head = spec(LOGIN, LOCK);

		// Act
		const { removedIds, reworded } = run(spec(LOGIN), head);

		// Assert
		expect({ removedIds, reworded }).toEqual({
			removedIds: [{ id: "AUTH-2", file: "specs/auth.md" }],
			reworded: []
		});
	});

	test("an ID whose behaviour sentence changed is reworded, with its line", () => {
		// Arrange
		const head = spec(LOGIN, LOCK);
		const now = spec(
			LOGIN,
			"## AUTH-2 Lockout\n\nThree failures lock the account.\n"
		);

		// Act
		const { removedIds, reworded } = run(now, head);

		// Assert
		expect({ removedIds, reworded }).toEqual({
			removedIds: [],
			reworded: [{ id: "AUTH-2", file: "specs/auth.md", line: 7 }]
		});
	});

	test("a new ID, a new spec file, a reflow and a moved ID are not drift", () => {
		// Arrange
		const head = spec(LOGIN);
		const reflowed = spec(
			"## AUTH-1 Login\n\nA valid user\nreceives   a session.\n",
			LOCK
		);

		// Act
		const added = run(reflowed, head);
		const fresh = run(reflowed);
		const moved = checkSpecs({
			listing: "specs/auth.md\nspecs/session.md\n",
			diff: "",
			texts: new Map([
				["specs/auth.md", spec(LOCK)],
				["specs/session.md", `# Session\n\n${LOGIN}`]
			]),
			head: new Map([["specs/auth.md", spec(LOGIN, LOCK)]])
		});

		// Assert
		expect(
			[added, fresh, moved].map((r) => [r.removedIds, r.reworded])
		).toEqual([
			[[], []],
			[[], []],
			[[], []]
		]);
	});

	test("a path limits drift to that spec file", () => {
		// Arrange
		const head = spec(LOGIN, LOCK);

		// Act
		const { removedIds } = run(spec(LOGIN), head, { path: "specs/other.md" });

		// Assert
		expect(removedIds).toEqual([]);
	});
});
