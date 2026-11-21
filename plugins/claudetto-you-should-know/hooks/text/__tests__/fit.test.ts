import { describe, expect, test } from "claude-code/testing";

import { fitLine, lineCellsAtMost } from "../fit";

describe("display width", () => {
	test("counts narrow ranges as 1 and wide glyphs as 2, and fits with an ellipsis", () => {
		expect(lineCellsAtMost("ab→─")).toBe(4);
		expect(lineCellsAtMost("漢")).toBe(2);
		expect(lineCellsAtMost("◽")).toBe(2);
		expect(fitLine("abcdefgh", 5)).toBe("abcd…");
		expect(fitLine("abc", 5)).toBe("abc");
	});
});
