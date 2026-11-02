import { describe, expect, test } from "bun:test";
import { type Facts, failureOf } from "../../../fixtures/W5-11_I13/grade.ts";

const OTHER = `export function summarizeOrder(raw: Record<string, string>): string {
	return raw["a"] ?? "";
}`;

const ORIGINAL = `export const fetchUser = async () => 1;\n\n${OTHER}\n`;

const GOOD: Facts = {
	original: ORIGINAL,
	api: `export const getUser = async () => 1;\n\n${OTHER}\n`,
	web: [
		"const a = await getUser(1);",
		"const b = await getUser(2);",
		"const c = await getUser(3);",
	],
};

describe("the verdict of case `W5-11_I13`", () => {
	test("passes a rename that reaches the three call sites and spares the rest", () => {
		expect(failureOf(GOOD)).toBeUndefined();
	});

	test("fails a call site that kept the old name", () => {
		const web = [GOOD.web[0] ?? "", GOOD.web[1] ?? "", "await fetchUser(3);"];

		expect(failureOf({ ...GOOD, web })).toContain("fetchUser");
	});

	test("fails an `api.ts` that kept the old name", () => {
		expect(failureOf({ ...GOOD, api: ORIGINAL })).toContain("fetchUser");
	});

	test("fails when only two call sites use the new name", () => {
		const web = [GOOD.web[0] ?? "", GOOD.web[1] ?? "", "nothing"];

		expect(failureOf({ ...GOOD, web })).toContain("getUser");
	});

	test("fails a rewrite of the unrelated function", () => {
		const api = GOOD.api.replace('raw["a"] ?? ""', 'raw["a"] ?? "none"');

		expect(failureOf({ ...GOOD, api })).toContain("summarizeOrder");
	});

	test("fails when the unrelated function is gone", () => {
		expect(
			failureOf({ ...GOOD, api: "export const getUser = 1;\n" }),
		).toContain("summarizeOrder");
	});
});
