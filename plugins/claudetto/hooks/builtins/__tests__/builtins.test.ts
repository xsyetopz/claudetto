import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../shared/field";

/** Serves a user settings file to a session start and keeps what the plugin writes back to it. */
const serve = (on: On, initial: string | undefined) => {
	const file = { text: initial, writes: 0 };
	const store = new Map<string, unknown>();
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", () => ({ value: file.text !== undefined }));
	on("fs.read", () => ({ value: file.text ?? "" }));
	on("fs.write", (_$, e) => {
		file.text = e.text;
		file.writes++;
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "Reloaded" }));
	return file;
};

const START = {
	cwd: "/home/u/p",
	surface: null,
	isInteractive: true
} as const;

/** The `*@builtin` entries of the written file's `enabledPlugins`. */
const builtinsOf = (text: string | undefined): [string, unknown][] => {
	const plugins = fieldOf(JSON.parse(text ?? "{}"), "enabledPlugins");
	return Object.entries(plugins ?? {}).filter(([key]) =>
		key.endsWith("@builtin")
	);
};

describe("builtin disable at session start", () => {
	test("a user without settings gets every builtin plugin switched off, privacy and claude-platform included", async ($, on) => {
		// Arrange
		const file = serve(on, void 0);

		// Act
		await $.session.start(START);

		// Assert
		const builtins = builtinsOf(file.text);
		expect(builtins.length).toBeGreaterThan(0);
		expect(builtins.every(([, enabled]) => enabled === false)).toBe(true);
		const keys = builtins.map(([key]) => key);
		expect(keys).toContain("cc-plugin-privacy@builtin");
		expect(keys).toContain("claude-platform@builtin");
	});

	test("a builtin the user set true is switched off while other keys and the indent stay", async ($, on) => {
		// Arrange
		const file = serve(
			on,
			`{\n  "model": "x",\n  "enabledPlugins": { "cc-plugin-tips@builtin": true, "a@b": true }\n}\n`
		);

		// Act
		await $.session.start(START);

		// Assert
		const next: unknown = JSON.parse(file.text ?? "");
		const plugins = fieldOf(next, "enabledPlugins");
		expect(fieldOf(next, "model")).toBe("x");
		expect(fieldOf(plugins, "a@b")).toBe(true);
		expect(fieldOf(plugins, "cc-plugin-tips@builtin")).toBe(false);
		expect(file.text?.split("\n")[1]?.startsWith('  "model"')).toBe(true);
	});

	test("a second start over settings with every builtin off writes nothing", async ($, on) => {
		// Arrange
		const file = serve(on, void 0);
		await $.session.start(START);
		const writes = file.writes;

		// Act
		await $.session.start(START);

		// Assert
		expect(file.writes).toBe(writes);
	});

	test("a settings file that is not a JSON object is left as it is", async ($, on) => {
		// Arrange
		const broken = serve(on, "{ broken");

		// Act
		await $.session.start(START);

		// Assert
		expect(broken.writes).toBe(0);
		expect(broken.text).toBe("{ broken");
	});

	test("a settings file holding a JSON array is left as it is", async ($, on) => {
		// Arrange
		const list = serve(on, "[]");

		// Act
		await $.session.start(START);

		// Assert
		expect(list.writes).toBe(0);
		expect(list.text).toBe("[]");
	});
});
