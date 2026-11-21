import { describe, expect, test } from "claude-code/testing";

import { pathsIn } from "../paths";

describe("goal condition paths", () => {
	test("finds slash paths and bare file names, once each", () => {
		// Arrange
		const condition = "src/a.ts and ./b/c.md pass; README.md lists src/a.ts";

		// Act
		const found = pathsIn(condition);

		// Assert
		expect(found).toEqual(["src/a.ts", "./b/c.md", "README.md"]);
	});

	test("leaves out plain words, versions, URLs, hosts and abbreviations", () => {
		// Arrange
		const condition =
			"the file x exists on v2.1.330, e.g. see https://example.com/a/b and example.com";

		// Act
		const found = pathsIn(condition);

		// Assert
		expect(found).toEqual([]);
	});
});
