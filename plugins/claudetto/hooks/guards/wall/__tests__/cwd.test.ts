import { describe, expect, test } from "claude-code/testing";

import { attempt, attemptEach, stubBash, stubHome } from "./harness";

describe("wall guard by session folder", () => {
	test("in a session that runs in home, a relative path to the wall is refused and one in a project runs", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		on("session.cwd", () => ({ value: "/Users/u" }));

		// Act
		const results = await attemptEach($, [
			"ls .claudetto-holdout",
			"ls `printf .claudetto-holdout`",
			"cat ./.claudetto-holdout/t.md",
			"ls .c*-holdout"
		]);
		await attempt($, "ls work/.claudetto-holdout");

		// Assert
		expect(results.every((r) => JSON.stringify(r).includes("walled off"))).toBe(
			true
		);
		expect(ran).toHaveLength(1);
		expect(ran[0]).toContain("ls work/.claudetto-holdout");
	});

	test("in a session that runs in a project, a relative path with the wall's name runs", async ($, on) => {
		// Arrange
		stubHome(on);
		const ran = stubBash(on);
		on("session.cwd", () => ({ value: "/Users/u/work" }));

		// Act
		await attempt($, "ls .claudetto-holdout");

		// Assert
		expect(ran).toHaveLength(1);
		expect(ran[0]).toContain("ls .claudetto-holdout");
	});
});
