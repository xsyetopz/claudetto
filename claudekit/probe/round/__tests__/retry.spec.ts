import { describe, expect, test } from "bun:test";
import { worthRetry } from "../retry.ts";

describe("worthRetry", () => {
	test("a stream that stopped before its result event is run again", () => {
		expect(worthRetry("step 1: no result event")).toBe(true);
	});

	test("a non-zero exit is run again", () => {
		expect(worthRetry("step 1: exit 1")).toBe(true);
	});

	test("a failure during execution is run again", () => {
		expect(worthRetry("step 1: is_error (error_during_execution)")).toBe(true);
	});

	test("a fork that used its turn budget is not run again", () => {
		expect(worthRetry("step 1: is_error (error_max_turns)")).toBe(false);
	});

	test("a cost reading the harness cannot trust is not run again", () => {
		expect(worthRetry("step 2: total_cost_usd fell from 5 to 4")).toBe(false);
	});

	test("a session with no id is not run again", () => {
		expect(worthRetry("step 1: no session_id")).toBe(false);
	});

	test("an unrecognized cause is not run again", () => {
		expect(worthRetry("step 1: subtype error_other")).toBe(false);
	});

	test("a step that exited cleanly but reported nothing is told from a word containing exit", () => {
		expect(worthRetry("threw: git exited with a bad tag")).toBe(false);
	});
});
