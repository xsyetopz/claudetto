import { describe, expect, test } from "claude-code/testing";

import { compose, extract, isCommit, parseTokens, threshold } from "../text";

describe("handover text", () => {
	test("extract keeps user prompts and the last answer", () => {
		const out = extract([
			{ role: "user", text: "fix the parser" },
			{ role: "assistant", text: "first" },
			{ role: "user", text: "  " },
			{ role: "assistant", text: "done, tests pass" }
		]);
		expect(out).toContain("- fix the parser");
		expect(out).toContain("done, tests pass");
		expect(out).not.toContain("first");
	});
	test("extract never cuts a surrogate pair when it shortens a row", () => {
		const lone =
			/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
		// 499 code units, then an emoji straddling the 500-unit row limit.
		const prompt = `${"a".repeat(499)}😀tail`;
		const answer = `${"b".repeat(999)}😀tail`;
		const out = extract([
			{ role: "user", text: prompt },
			{ role: "assistant", text: answer }
		]);
		expect(lone.test(out)).toBe(false);
	});
	test("compose appends the git state", () => {
		const out = compose("body", "abc1234", "");
		expect(out).toContain("git HEAD: abc1234");
		expect(out).toContain("(clean)");
	});
	test("parseTokens reads plain, k and M", () => {
		expect(parseTokens("70000")).toBe(70_000);
		expect(parseTokens("70k")).toBe(70_000);
		expect(parseTokens("1.5M")).toBe(1_500_000);
		expect(parseTokens("lots")).toBe(undefined);
	});
	test("threshold defaults to 70k; percent beats tokens", () => {
		expect(threshold(200_000, void 0, void 0)).toBe(70_000);
		expect(threshold(200_000, void 0, "100k")).toBe(100_000);
		expect(threshold(200_000, "50", "100k")).toBe(100_000);
		expect(threshold(1_000_000, "10", void 0)).toBe(100_000);
	});
	test("isCommit matches commits only", () => {
		expect(isCommit("git commit -m x")).toBe(true);
		expect(isCommit("git add . && git commit -m x")).toBe(true);
		expect(isCommit("git -C repo commit -m x")).toBe(true);
		expect(isCommit("git log --grep commit")).toBe(false);
	});
});
