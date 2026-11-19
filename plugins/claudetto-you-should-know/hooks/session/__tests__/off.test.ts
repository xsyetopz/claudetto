import { describe, expect, test } from "claude-code/testing";

import { isOffCommand } from "../off";

describe("isOffCommand", () => {
	test("takes the plugin's own name and the three builtin names, bare or at builtin", () => {
		const names = ["claudetto-you-should-know", "cc-plugin-you-should-know", "suggest-learning", "you-should-know"];
		for (const n of names) {
			expect(isOffCommand(`/plugin disable ${n}`)).toBe(true);
			expect(isOffCommand(`/plugin disable ${n}@builtin`)).toBe(true);
		}
	});

	test("refuses other plugins, other verbs and a missing name", () => {
		expect(isOffCommand("/plugin disable other")).toBe(false);
		expect(isOffCommand("/plugin enable you-should-know")).toBe(false);
		expect(isOffCommand("/plugin disable")).toBe(false);
		expect(isOffCommand("plugin disable you-should-know")).toBe(false);
	});
});
