import { describe, expect, test } from "claude-code/testing";
import { compose, extract, isCommit, parseTokens, threshold } from "./text";

describe("handover text", () => {
	test("extract keeps user prompts and the last answer", () => {
		const out = extract([
			{ role: "user", text: "fix the parser" },
			{ role: "assistant", text: "first" },
			{ role: "user", text: "  " },
			{ role: "assistant", text: "done, tests pass" },
		]);
		expect(out).toContain("- fix the parser");
		expect(out).toContain("done, tests pass");
		expect(out).not.toContain("first");
	});
	test("compose appends the git state", () => {
		const out = compose("body", "abc1234", "");
		expect(out).toContain("git HEAD: abc1234");
		expect(out).toContain("(clean)");
	});
	test("parseTokens reads plain, k and M", () => {
		expect(parseTokens("70000")).toBe(70000);
		expect(parseTokens("70k")).toBe(70000);
		expect(parseTokens("1.5M")).toBe(1500000);
		expect(parseTokens("lots")).toBe(undefined);
	});
	test("threshold defaults to 70k; percent beats tokens", () => {
		expect(threshold(200000, undefined, undefined)).toBe(70000);
		expect(threshold(200000, undefined, "100k")).toBe(100000);
		expect(threshold(200000, "50", "100k")).toBe(100000);
		expect(threshold(1000000, "10", undefined)).toBe(100000);
	});
	test("isCommit matches commits only", () => {
		expect(isCommit("git commit -m x")).toBe(true);
		expect(isCommit("git add . && git commit -m x")).toBe(true);
		expect(isCommit("git -C repo commit -m x")).toBe(true);
		expect(isCommit("git log --grep commit")).toBe(false);
	});
});
