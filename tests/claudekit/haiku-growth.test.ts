import { describe, expect, test } from "bun:test";
import { growthOf } from "../../claudekit/haiku-growth/main.ts";
import { HAIKU_MODEL } from "../../plugins/claudetto/src/tiers/tiers.ts";

const line = (
	uuid: string,
	parentUuid: string | null,
	id: string,
	prompt: number,
): string =>
	JSON.stringify({
		uuid,
		parentUuid,
		isSidechain: false,
		sessionId: "s",
		message: {
			id,
			model: HAIKU_MODEL,
			usage: {
				input_tokens: 2,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: prompt - 2,
			},
		},
	});

const file = (...lines: string[]): string => lines.join("\n");

describe("growthOf", () => {
	test("two responses of one thread give one step of the difference", () => {
		const text = file(line("a", null, "m1", 1000), line("b", "a", "m2", 6000));

		const growth = growthOf([text]);

		expect(growth.steps).toEqual([5000]);
		expect(growth.responses).toBe(2);
	});

	test("responses whose parent chains reach different roots give no step", () => {
		const text = file(
			line("a", null, "m1", 1000),
			line("x", null, "m2", 90_000),
			line("b", "a", "m3", 1500),
			line("y", "x", "m4", 95_000),
		);

		const growth = growthOf([text]);

		expect(growth.steps.toSorted((l, r) => l - r)).toEqual([500, 5000]);
	});

	test("one step across two roots is not counted", () => {
		const text = file(
			line("a", null, "m1", 1000),
			line("x", null, "m2", 90_000),
		);

		const growth = growthOf([text]);

		expect(growth.steps).toEqual([]);
		expect(growth.responses).toBe(2);
	});

	test("a link through a line that is not a response joins the thread", () => {
		const text = file(
			line("a", null, "m1", 1000),
			JSON.stringify({ uuid: "t", parentUuid: "a", type: "user" }),
			line("b", "t", "m2", 4000),
		);

		const growth = growthOf([text]);

		expect(growth.steps).toEqual([3000]);
	});

	test("a repeated message id is counted once", () => {
		const text = file(
			line("a", null, "m1", 1000),
			line("b", "a", "m1", 1000),
			line("c", "b", "m2", 2000),
		);

		const growth = growthOf([text]);

		expect(growth.responses).toBe(2);
		expect(growth.steps).toEqual([1000]);
	});

	test("a step down gives no negative step and restarts the series", () => {
		const text = file(
			line("a", null, "m1", 50_000),
			line("b", "a", "m2", 2000),
			line("c", "b", "m3", 3000),
		);

		const growth = growthOf([text]);

		expect(growth.steps).toEqual([1000]);
	});

	test("a parent cycle ends instead of looping", () => {
		const text = file(line("a", "b", "m1", 1000), line("b", "a", "m2", 2000));

		const growth = growthOf([text]);

		expect(growth.responses).toBe(2);
	});
});
