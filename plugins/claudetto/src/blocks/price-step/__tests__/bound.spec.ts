import { expect, test } from "bun:test";
import type { TurnUsage } from "claude-code";
import { HAIKU_MODEL, HAIKU_PRICE_STEP } from "../../../tiers/tiers.ts";
import { boundOf, tokensOf } from "../bound.ts";

const usage = (model: string, input: number): TurnUsage => ({
	model,
	input_tokens: input,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
	output_tokens: 0,
});

test("a result is counted at three characters a token, rounded up", () => {
	expect(tokensOf(3)).toBe(1);
	expect(tokensOf(4)).toBe(2);
});

test("the prompt is the step's four token counts together", () => {
	const step: TurnUsage = {
		model: HAIKU_MODEL,
		input_tokens: 1,
		cache_read_input_tokens: 2,
		cache_creation_input_tokens: 3,
		output_tokens: 4,
	};

	expect(boundOf(step, 0, 0)).toEqual({ withhold: false, tokens: 0 });
	expect(boundOf(step, HAIKU_PRICE_STEP - 10, 0)).toEqual({
		withhold: false,
		tokens: 0,
	});
	expect(boundOf(step, HAIKU_PRICE_STEP - 10, 3)).toEqual({
		withhold: true,
		tokens: 1,
		total: HAIKU_PRICE_STEP + 1,
	});
});

test("a Haiku result that ends on the step passes, and one token over is withheld", () => {
	const step = usage(HAIKU_MODEL, HAIKU_PRICE_STEP - 100);

	expect(boundOf(step, 0, 300)).toEqual({ withhold: false, tokens: 100 });
	expect(boundOf(step, 0, 301)).toMatchObject({ withhold: true, tokens: 101 });
});

test("the results the step already passed count toward the step", () => {
	const step = usage(HAIKU_MODEL, HAIKU_PRICE_STEP - 100);

	expect(boundOf(step, 50, 150)).toEqual({ withhold: false, tokens: 50 });
	expect(boundOf(step, 50, 153)).toMatchObject({ withhold: true });
});

test("a dated Haiku 5.5 id is bounded too", () => {
	const step = usage(`${HAIKU_MODEL}-20261001`, HAIKU_PRICE_STEP);

	expect(boundOf(step, 0, 3)).toMatchObject({ withhold: true });
});

test("another model's result passes whatever its size", () => {
	const step = usage("claude-sonnet-5-5", HAIKU_PRICE_STEP);

	expect(boundOf(step, 0, 3_000_000)).toMatchObject({ withhold: false });
});

test("a step with no reading passes its result", () => {
	expect(boundOf(null, 0, 3_000_000)).toMatchObject({ withhold: false });
});
