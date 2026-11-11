import { expect, test } from "bun:test";

import { contentsOf, fieldOf, listOf, PLUGINS } from "./validator.ts";

const EVENTS = ["tool.check", "tool.call"];

const guardsOf = async (plugin: string): Promise<unknown[]> => {
	const contents = await contentsOf(plugin);
	return contents
		.flatMap((c) => listOf(fieldOf(c, "gatingHooks")))
		.filter((g) => EVENTS.some((event) => fieldOf(g, "pattern") === event));
};

test.each(PLUGINS)(
	"%s has at most one tool.check and one tool.call hook, each with a .catch",
	async (plugin) => {
		const guards = await guardsOf(plugin);

		expect(guards.length).toBeGreaterThan(0);
		expect(guards.filter((g) => fieldOf(g, "hasCatch") !== true)).toEqual([]);
		for (const event of EVENTS) {
			expect(
				guards.filter((g) => fieldOf(g, "pattern") === event).length,
			).toBeLessThanOrEqual(1);
		}
	},
);
