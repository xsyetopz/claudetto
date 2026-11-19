import type { EngineInterface } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { looksToSkipAfter, mayBeDriven, switchOf } from "../backoff";

describe("looksToSkipAfter", () => {
	test("is free for the first two ignored notes", () => {
		expect([0, 1, 2].map(looksToSkipAfter)).toEqual([0, 0, 0]);
	});

	test("doubles from the third and stops at 16", () => {
		expect([3, 4, 5, 6, 7].map(looksToSkipAfter)).toEqual([1, 2, 4, 8, 16]);
		expect(looksToSkipAfter(8)).toBe(16);
		expect(looksToSkipAfter(100)).toBe(16);
	});

	test("is 0,0,0 then 1,2,4,8 and caps at 16", () => {
		expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 20].map(looksToSkipAfter)).toEqual([0, 0, 0, 1, 2, 4, 8, 16, 16, 16]);
	});
});

describe("switchOf", () => {
	test("is on for 1, true, yes and on in any case", async () => {
		for (const word of ["1", "true", " YES ", "On"]) {
			expect(await switchOf(Promise.resolve(word))).toBe(true);
		}
	});

	test("is off for anything else, unset or a failed read", async () => {
		expect(await switchOf(Promise.resolve("0"))).toBe(false);
		expect(await switchOf(Promise.resolve(undefined))).toBe(false);
		expect(await switchOf(Promise.reject(new Error("no")))).toBe(false);
	});

	test("reads 1, true, yes, on in any case and trimmed; all else and failures are off", async () => {
		for (const v of ["1", "true", "YES", " On "]) {
			expect(await switchOf(Promise.resolve(v))).toBe(true);
		}
		for (const v of ["0", "no", "", "2"]) {
			expect(await switchOf(Promise.resolve(v))).toBe(false);
		}
		expect(await switchOf(Promise.resolve(undefined))).toBe(false);
		expect(await switchOf(Promise.reject(new Error("x")))).toBe(false);
	});
});

describe("mayBeDriven", () => {
	let vars: Record<string, string> = {};
	const engine = () => ({ env: { get: async (n: string) => vars[n] } }) as unknown as EngineInterface;
	test("is false with none of the driver variables set", async () => {
		vars = {};
		expect(await mayBeDriven(engine())).toBe(false);
	});

	test("is true for a session kind, a job dir or a child session", async () => {
		for (const name of ["CLAUDE_CODE_SESSION_KIND", "CLAUDE_JOB_DIR", "CLAUDE_CODE_CHILD_SESSION"]) {
			vars = { [name]: "x" };
			expect(await mayBeDriven(engine())).toBe(true);
		}
	});

	test("CLAUDECODE alone is not enough, with the history skip it is", async () => {
		vars = { CLAUDECODE: "1" };
		expect(await mayBeDriven(engine())).toBe(false);
		vars = { CLAUDECODE: "1", CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1" };
		expect(await mayBeDriven(engine())).toBe(true);
	});
});
