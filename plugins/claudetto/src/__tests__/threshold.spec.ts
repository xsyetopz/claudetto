import { describe, expect, test } from "bun:test";
import {
	AUTOCOMPACT_PCT,
	autocompactPctText,
	blockAt,
	CONTEXT_WINDOW,
	compactAt,
	effectiveWindow,
	HAIKU_CONTEXT_WINDOW,
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
	pctFor,
	windowFor,
	windowForFloor,
} from "../threshold.ts";

describe("the shipped values hit the trigger exactly", () => {
	test("the default window compacts at the handoff trigger", () => {
		expect(compactAt(CONTEXT_WINDOW, AUTOCOMPACT_PCT)).toBe(
			HANDOFF_TRIGGER_TOKENS,
		);
	});

	test("the Haiku window compacts at the Haiku trigger", () => {
		expect(compactAt(HAIKU_CONTEXT_WINDOW, AUTOCOMPACT_PCT)).toBe(
			HAIKU_HANDOFF_TRIGGER_TOKENS,
		);
	});

	test("the percentage is written with the four decimals the key takes", () => {
		expect(autocompactPctText()).toBe("50.0000");
	});

	test("the percentage is derived from the window and the trigger", () => {
		expect(pctFor(CONTEXT_WINDOW, HANDOFF_TRIGGER_TOKENS)).toBe(
			AUTOCOMPACT_PCT,
		);
	});

	test("the Haiku window is derived from the Haiku trigger", () => {
		expect(windowFor(HAIKU_HANDOFF_TRIGGER_TOKENS, AUTOCOMPACT_PCT)).toBe(
			HAIKU_CONTEXT_WINDOW,
		);
	});
});

describe("the formula against the measured firings", () => {
	test("this login's percentage reproduces the threshold its 35 boundaries fired at", () => {
		expect(compactAt(CONTEXT_WINDOW, 80.3571)).toBe(224_999);
	});
});

describe("the harness's own floor", () => {
	test("no percentage leaves the window less the two reserves", () => {
		expect(compactAt(CONTEXT_WINDOW)).toBe(267_000);
	});

	test("a percentage above the floor loses to the floor", () => {
		expect(compactAt(CONTEXT_WINDOW, 99)).toBe(267_000);
	});

	test("a percentage outside the range the harness accepts is ignored", () => {
		expect(compactAt(CONTEXT_WINDOW, 0)).toBe(267_000);
		expect(compactAt(CONTEXT_WINDOW, -50)).toBe(267_000);
		expect(compactAt(CONTEXT_WINDOW, 101)).toBe(267_000);
	});

	test("a percentage at the top of the range is taken", () => {
		expect(compactAt(CONTEXT_WINDOW, 100)).toBe(267_000);
		expect(compactAt(CONTEXT_WINDOW, 95)).toBe(266_000);
	});
});

describe("the headroom between the trigger and the hard block", () => {
	test("the shipped window leaves the whole middle of the window", () => {
		expect(blockAt(CONTEXT_WINDOW)).toBe(277_000);
		expect(blockAt(CONTEXT_WINDOW) - HANDOFF_TRIGGER_TOKENS).toBe(137_000);
	});

	test("the window that reaches the trigger without a percentage leaves 10,000", () => {
		const window = windowForFloor(HANDOFF_TRIGGER_TOKENS);

		expect(window).toBe(173_000);
		expect(compactAt(window)).toBe(HANDOFF_TRIGGER_TOKENS);
		expect(blockAt(window) - HANDOFF_TRIGGER_TOKENS).toBe(10_000);
	});
});

describe("the output reserve", () => {
	test("a model whose output limit is above the cap reserves the cap", () => {
		expect(effectiveWindow(CONTEXT_WINDOW, 64_000)).toBe(280_000);
	});

	test("a model whose output limit is below the cap reserves its own limit", () => {
		expect(effectiveWindow(CONTEXT_WINDOW, 8192)).toBe(291_808);
	});

	test("a smaller output limit raises the trigger", () => {
		expect(compactAt(CONTEXT_WINDOW, AUTOCOMPACT_PCT, 8192)).toBe(145_904);
	});
});
