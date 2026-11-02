import { describe, expect, test } from "bun:test";
import { DROPPED_DENIES, denyFaults, denyList, NEVER_DENY } from "../deny.ts";

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

	test("a deny of every faulty name gives one line each", () => {
		expect(denyFaults(["ToolSearch", "Skill", "Bash"])).toHaveLength(3);
	});
});

describe("the names no reading supports", () => {
	test("no dropped name is in the list claudetto writes", () => {
		const written = denyList();

		for (const group of DROPPED_DENIES) {
			for (const name of group.names) {
				expect(written).not.toContain(name);
			}
		}
	});
});
