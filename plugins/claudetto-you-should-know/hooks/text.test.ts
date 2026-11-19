import { describe, expect, test } from "claude-code/testing";

import { cellsAtMost, sliceUnitsHead, truncateAtWordBoundary } from "./text";

describe("text truncation", () => {
	test("a cut keeps wide characters inside the width budget", () => {
		// Arrange
		const text = "😀".repeat(40);

		// Act
		const cut = truncateAtWordBoundary(text, 20);

		// Assert
		expect(cellsAtMost(cut)).toBeLessThanOrEqual(20);
	});

	test("a cut through a surrogate pair drops its first half", () => {
		// Act and Assert
		expect(sliceUnitsHead("a😀b", 2)).toBe("a");
		expect(sliceUnitsHead("a😀b", 3)).toBe("a😀");
	});
});
