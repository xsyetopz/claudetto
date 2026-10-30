// Every expected number here is arithmetic written out against the baseline of `docs/surfaces.md`.

import { describe, expect, test } from "bun:test";
import {
	BASELINE_TOOLS,
	BASELINE_TOTAL,
	DENIED_TOGETHER_TOOLS,
	DENIED_TOGETHER_TOTAL,
	DENIED_TOOLS,
	DROPPED_DENIES,
	denyFaults,
	denyList,
	NEVER_DENY,
} from "../deny.ts";

/** A definition costs its JSON plus the comma that joins it. */
const inArray = (definition: number): number => definition + 1;

const SMALLEST_DEFINITION = 204;

const sumOf = (values: readonly number[]): number => {
	let total = 0;
	for (const value of values) {
		total += value;
	}
	return total;
};

describe("the reading behind each denied name", () => {
	for (const entry of DENIED_TOOLS) {
		test(`${entry.name} removes its definition and nothing else`, () => {
			expect(entry.chars).toBeGreaterThan(0);
			expect(BASELINE_TOTAL - entry.total).toBe(inArray(entry.chars));
			expect(BASELINE_TOOLS - entry.tools).toBe(inArray(entry.chars));
		});
	}

	test("the three denied together fall by the sum of their definitions", () => {
		const sum = sumOf(DENIED_TOOLS.map((entry) => inArray(entry.chars)));

		expect(sum).toBe(5356 + 4887 + 2178);
		expect(BASELINE_TOTAL - DENIED_TOGETHER_TOTAL).toBe(sum);
		expect(BASELINE_TOOLS - DENIED_TOGETHER_TOOLS).toBe(sum);
	});
});

describe("the names that must not be denied", () => {
	test("the list claudetto writes has no fault", () => {
		expect(denyFaults(denyList())).toEqual([]);
	});

	for (const entry of NEVER_DENY) {
		test(`a deny of ${entry.name} is a fault that names its reading`, () => {
			const faults = denyFaults([...denyList(), entry.name]);

			expect(faults).toHaveLength(1);
			expect(faults[0]).toBe(`${entry.name} must not be denied: ${entry.why}.`);
		});
	}

	test("only the `Bash` deny lowers the request", () => {
		const lowers = NEVER_DENY.filter((entry) => entry.chars < 0);

		expect(lowers.map((entry) => entry.name)).toEqual(["Bash"]);
	});

	test("a deny of every faulty name gives one line each", () => {
		expect(denyFaults(["ToolSearch", "Skill", "Bash"])).toHaveLength(3);
	});
});

describe("the names no reading supports", () => {
	for (const group of DROPPED_DENIES) {
		test(`a deny of ${group.names.join(", ")} removes no definition`, () => {
			expect(group.tools).toBe(BASELINE_TOOLS);
			expect(BASELINE_TOTAL - group.total).toBeLessThan(SMALLEST_DEFINITION);
		});
	}

	test("no dropped name is in the list claudetto writes", () => {
		const written = denyList();

		for (const group of DROPPED_DENIES) {
			for (const name of group.names) {
				expect(written).not.toContain(name);
			}
		}
	});
});
