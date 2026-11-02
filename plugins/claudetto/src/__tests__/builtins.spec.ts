import { describe, expect, test } from "bun:test";
import {
	BUILTIN_CHARS,
	BUILTIN_CUTS,
	BUILTIN_PLUGINS,
	BUNDLED_SKILLS_KEY,
	builtinId,
	builtinSnippet,
	ENABLED_PLUGINS_KEY,
	enabledPlugins,
	pluginsKept,
	pluginsOff,
} from "../builtins.ts";

describe("the plugin block", () => {
	test("turns off every built-in plugin but the one that reads policy only", () => {
		const block = enabledPlugins();

		expect(Object.keys(block)).toHaveLength(BUILTIN_PLUGINS.length - 1);
		expect(block["cc-plugin-sec-default@builtin"]).toBeUndefined();
	});

	test("writes false and never true, because a true would turn a plugin on", () => {
		const values = Object.values(enabledPlugins());

		expect(values.every((value) => value === false)).toBe(true);
	});

	test("names each plugin with its registered prefix and the builtin marketplace", () => {
		expect(builtinId("tips")).toBe("cc-plugin-tips@builtin");
	});

	test("every plugin it leaves alone carries a reason", () => {
		const kept = pluginsKept();

		expect(kept.map((row) => row.name)).toStrictEqual(["sec-default"]);
		expect(kept.every((row) => (row.why ?? "") !== "")).toBe(true);
	});

	test("every plugin it turns off is in the block", () => {
		const block = enabledPlugins();

		for (const row of pluginsOff()) {
			expect(block[builtinId(row.name)]).toBe(false);
		}
	});
});

describe("the snippet", () => {
	test("sets both switches", () => {
		const snippet = builtinSnippet();

		expect(snippet[BUNDLED_SKILLS_KEY]).toBe(true);
		expect(Object.keys(snippet[ENABLED_PLUGINS_KEY]).length).toBeGreaterThan(0);
	});
});

const reading = (settings: string) =>
	BUILTIN_CUTS.find((row) => row.settings === settings);

describe("the readings that decided the switches", () => {
	test("the shipped cut is the difference the shipped rows read", () => {
		const before = reading("the shipped combination");
		const after = reading("the shipped combination with both switches");

		expect((before?.total ?? 0) - (after?.total ?? 0)).toBe(BUILTIN_CHARS);
	});

	test("the shipped cut comes out of the messages alone", () => {
		const before = reading("the shipped combination");
		const after = reading("the shipped combination with both switches");

		expect(before?.tools).toBe(after?.tools);
		expect((before?.messages ?? 0) - (after?.messages ?? 0)).toBe(
			BUILTIN_CHARS,
		);
	});
});
