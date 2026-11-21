import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../shared/field";
import { FILL_VERSION } from "../defaults";

/** Serves a settings file and a store to a session start; records writes and the store. */
const serve = (on: On, file: string, seed: Record<string, unknown> = {}) => {
	const writes: string[] = [];
	const store = new Map<string, unknown>(Object.entries(seed));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", () => ({ value: true }));
	on("fs.read", () => ({ value: file }));
	on("fs.write", (_$, e) => {
		writes.push(e.text);
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	return { writes, store };
};

describe("settings fill at session start", () => {
	test("writes the construction over the user's style, then records the fill version and the keys it wrote", async ($, on) => {
		// Arrange
		const { writes, store } = serve(on, '{"outputStyle": "Proactive"}');

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(JSON.parse(writes.at(-1) ?? "{}")).toMatchObject({
			outputStyle: "claudetto:Claudetto"
		});
		expect(store.get("setup.filled")).toBe(FILL_VERSION);
		expect(store.get("setup.owned")).toContainEqual({
			path: ["outputStyle"],
			value: "claudetto:Claudetto"
		});
	});

	test("takes back a recorded key the construction no longer names while it holds the written value", async ($, on) => {
		// Arrange
		const { writes } = serve(on, '{"env": {"RETIRED_SWITCH": "1"}}', {
			"setup.filled": "older",
			"setup.owned": [{ path: ["env", "RETIRED_SWITCH"], value: "1" }]
		});

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		const written: unknown = JSON.parse(writes.at(-1) ?? "{}");
		expect(fieldOf(written, "env")).not.toHaveProperty("RETIRED_SWITCH");
	});

	test("does not fill again under the same fill version, so a user's edit holds", async ($, on) => {
		// Arrange
		const { writes } = serve(on, '{"outputStyle": "Proactive"}', {
			"setup.filled": FILL_VERSION
		});

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		for (const text of writes) {
			expect(JSON.parse(text)).toMatchObject({ outputStyle: "Proactive" });
		}
	});
});
