import { describe, expect, test } from "bun:test";
import type { Item, Request, Session } from "../../transcripts/transcripts.ts";
import { rereads } from "../rereads.ts";

const requestAt = (index: number): Request => ({
	kind: "request",
	fresh: 0,
	read: 1000,
	write: 0,
	out: 10,
	model: "claude-opus-5-5",
	at: 0,
	tools: [],
	paths: index % 3 === 0 ? [] : [`/f${(index * index) % 17}.ts`],
});

const session = (): Session => {
	const items: Item[] = [];
	for (let index = 0; index < 120; index += 1) {
		if (index === 50) {
			items.push({
				kind: "boundary",
				trigger: "auto",
				pre: 100,
				post: 10,
				ms: 1,
			});
		}
		items.push(requestAt(index));
	}
	return items;
};

const draw = (seed: number) =>
	rereads([session()], undefined, { controls: true, seed, per: 5 });

describe("the seeded control draw of rereads", () => {
	test("draws 5 control points per boundary", () => {
		const got = draw(11);

		expect(got.points).toBe(5);
	});

	test("the same seed gives the same draw", () => {
		const first = draw(11);
		const second = draw(11);

		expect(second).toEqual(first);
	});

	test("a different seed gives a different draw", () => {
		const seeds = [1, 2, 3, 4, 5, 6];

		const draws = seeds.map((seed) => JSON.stringify(draw(seed)));

		expect(new Set(draws).size).toBeGreaterThan(1);
		expect(draws[0]).not.toBe(draws[1]);
	});

	test("the boundary arm does not depend on the seed", () => {
		const options = { controls: false, per: 5 };

		const first = rereads([session()], undefined, { ...options, seed: 1 });
		const second = rereads([session()], undefined, { ...options, seed: 2 });

		expect(first.points).toBe(1);
		expect(second).toEqual(first);
	});
});
