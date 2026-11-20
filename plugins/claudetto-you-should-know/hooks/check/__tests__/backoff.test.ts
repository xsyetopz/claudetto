import { describe, expect, test } from "claude-code/testing";

import { looksToSkipAfter, mayBeDriven, switchOf } from "../backoff";

describe("looksToSkipAfter", () => {
	test("is free for the first two ignored notes", () => {
		expect([0, 1, 2].map((n) => looksToSkipAfter(n))).toEqual([0, 0, 0]);
	});

	test("doubles from the third and stops at 16", () => {
		expect([3, 4, 5, 6, 7].map((n) => looksToSkipAfter(n))).toEqual([
			1, 2, 4, 8, 16
		]);
		expect(looksToSkipAfter(8)).toBe(16);
		expect(looksToSkipAfter(100)).toBe(16);
	});

	test("is 0,0,0 then 1,2,4,8 and caps at 16", () => {
		expect(
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 20].map((n) => looksToSkipAfter(n))
		).toEqual([0, 0, 0, 1, 2, 4, 8, 16, 16, 16]);
	});
});

/** Reads each value through `switchOf`; the reads do not depend on one another. */
const switches = (values: readonly string[]): Promise<boolean[]> =>
	Promise.all(values.map((value) => switchOf(Promise.resolve(value))));

/** A read of a variable nobody set. */
const unset = (): Promise<string | undefined> => engine({}).env.get("UNSET");

describe("switchOf", () => {
	test("is on for 1, true, yes and on in any case", async () => {
		expect(await switches(["1", "true", " YES ", "On"])).toEqual([
			true,
			true,
			true,
			true
		]);
	});

	test("is off for anything else, unset or a failed read", async () => {
		expect(await switchOf(Promise.resolve("0"))).toBe(false);
		expect(await switchOf(unset())).toBe(false);
		expect(await switchOf(Promise.reject(new Error("no")))).toBe(false);
	});

	test("reads 1, true, yes, on in any case and trimmed; all else and failures are off", async () => {
		expect(await switches(["1", "true", "YES", " On "])).toEqual([
			true,
			true,
			true,
			true
		]);
		expect(await switches(["0", "no", "", "2"])).toEqual([
			false,
			false,
			false,
			false
		]);
		expect(await switchOf(unset())).toBe(false);
		expect(await switchOf(Promise.reject(new Error("x")))).toBe(false);
	});
});

/** An engine whose environment holds only `vars`. */
const engine = (vars: Record<string, string>) => ({
	env: { get: (name: string) => Promise.resolve(vars[name]) }
});

describe("mayBeDriven", () => {
	test("is false with none of the driver variables set", async () => {
		expect(await mayBeDriven(engine({}))).toBe(false);
	});

	test("is true for a session kind, a job dir or a child session", async () => {
		const names = [
			"CLAUDE_CODE_SESSION_KIND",
			"CLAUDE_JOB_DIR",
			"CLAUDE_CODE_CHILD_SESSION"
		];
		const driven = await Promise.all(
			names.map((name) => mayBeDriven(engine({ [name]: "x" })))
		);
		expect(driven).toEqual([true, true, true]);
	});

	test("CLAUDECODE alone is not enough, with the history skip it is", async () => {
		expect(await mayBeDriven(engine({ CLAUDECODE: "1" }))).toBe(false);
		expect(
			await mayBeDriven(
				engine({ CLAUDECODE: "1", CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1" })
			)
		).toBe(true);
	});
});
