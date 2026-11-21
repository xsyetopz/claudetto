import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../shared/field";
import { BUILTIN_IDS, repairSettings } from "../builtins";

const ALL_OFF = Object.fromEntries(
	BUILTIN_IDS.map((id) => [`${id}@builtin`, false])
);

describe("builtin disable", () => {
	test("writes false for every builtin into empty settings", () => {
		const repair = repairSettings(void 0);
		expect(repair?.drifted.length).toBe(13);
		expect(JSON.parse(repair?.text ?? "")).toEqual({ enabledPlugins: ALL_OFF });
	});

	test("includes privacy and claude-platform", () => {
		const keys = repairSettings("{}")?.drifted ?? [];
		expect(keys).toContain("cc-plugin-privacy@builtin");
		expect(keys).toContain("claude-platform@builtin");
	});

	test("flips a builtin set true and keeps other keys and the indent", () => {
		const text = `{\n  "model": "x",\n  "enabledPlugins": { "cc-plugin-tips@builtin": true, "a@b": true }\n}\n`;
		const repair = repairSettings(text);
		expect(repair?.drifted.length).toBe(13);
		const next: unknown = JSON.parse(repair?.text ?? "");
		const plugins = fieldOf(next, "enabledPlugins");
		expect(fieldOf(next, "model")).toBe("x");
		expect(fieldOf(plugins, "a@b")).toBe(true);
		expect(fieldOf(plugins, "cc-plugin-tips@builtin")).toBe(false);
		expect(repair?.text.split("\n")[1]?.startsWith('  "model"')).toBe(true);
	});

	test("leaves settings with every builtin off unchanged", () => {
		const text = JSON.stringify({ enabledPlugins: ALL_OFF });
		expect(repairSettings(text)).toEqual({ text, drifted: [] });
	});

	test("refuses to rewrite a file that is not a JSON object", () => {
		expect(repairSettings("{ broken")).toBeUndefined();
		expect(repairSettings("[]")).toBeUndefined();
	});
});
