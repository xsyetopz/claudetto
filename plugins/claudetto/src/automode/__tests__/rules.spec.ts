import { describe, expect, test } from "bun:test";
import { AUTO_MODE_LISTS, DEFAULTS } from "../automode.ts";
import { autoModeFaults } from "../faults.ts";
import { ruleEntry, suiteSnippet } from "../rules.ts";

describe("each entry reads like a built-in entry", () => {
	test("a soft rule carries the consent bar the classifier frame reads", () => {
		const entry = ruleEntry({
			name: "Destroy Work",
			mustName: "the target",
			text: "Deleting it.",
			covers: [],
		});

		expect(entry).toBe(
			"Destroy Work [named+specifics — **must name:** the target]: Deleting it.",
		);
	});

	test("a rule with no bar has a plain name", () => {
		expect(ruleEntry({ name: "Local Work", text: "Tests.", covers: [] })).toBe(
			"Local Work: Tests.",
		);
	});
});

describe("the suite snippet", () => {
	test("holds no $defaults in any list", () => {
		for (const name of AUTO_MODE_LISTS) {
			expect(suiteSnippet().autoMode[name]).not.toContain(DEFAULTS);
			expect(suiteSnippet().autoMode[name].length).toBeGreaterThan(0);
		}
	});

	test("passes the fault check, which lets it replace the built-in lists", () => {
		expect(autoModeFaults(suiteSnippet())).toEqual([]);
	});
});
