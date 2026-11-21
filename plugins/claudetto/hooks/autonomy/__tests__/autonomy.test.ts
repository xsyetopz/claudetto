import { describe, expect, test } from "claude-code/testing";

import { isRecord } from "../../settings/settings";
import {
	AUTONOMY_MARK,
	AUTONOMY_OFF,
	AUTONOMY_ON,
	isFull,
	syncAutonomy
} from "../autonomy";

/** The `permissions.denyInsteadOfPrompting` value a settings text holds. */
const deny = (text: string): unknown => {
	const settings: unknown = JSON.parse(text);
	if (!isRecord(settings) || !isRecord(settings["permissions"])) {
		return undefined;
	}
	return settings["permissions"]["denyInsteadOfPrompting"];
};

/** The `permissions.allow` list a settings text holds. */
const allow = (text: string): unknown => {
	const settings: unknown = JSON.parse(text);
	return isRecord(settings) && isRecord(settings["permissions"])
		? settings["permissions"]["allow"]
		: undefined;
};

describe("autonomy option", () => {
	test("semi is the default, and only the value full turns full autonomy on", () => {
		// Act and Assert
		expect(isFull({})).toBe(false);
		expect(isFull({ autonomy: "semi" })).toBe(false);
		expect(isFull({ autonomy: "full" })).toBe(true);
	});

	test("full sets the built-in key and keeps the other permissions", () => {
		// Arrange
		const text = '{\n  "permissions": { "allow": ["Read"] }\n}\n';

		// Act
		const sync = syncAutonomy(text, true, false);

		// Assert
		expect(deny(sync.text)).toBe(true);
		expect(allow(sync.text)).toEqual(["Read"]);
		expect(sync.owned).toBe(true);
		expect(sync.notice).toBe(AUTONOMY_ON);
	});

	test("full leaves a value the person set, and does not claim it", () => {
		// Arrange
		const text = '{"permissions": {"denyInsteadOfPrompting": false}}';

		// Act
		const sync = syncAutonomy(text, true, false);

		// Assert
		expect(sync).toEqual({ text, owned: false });
	});

	test("semi removes the key only when full wrote it", () => {
		// Arrange
		const text = '{"permissions": {"denyInsteadOfPrompting": true}}';

		// Act
		const theirs = syncAutonomy(text, false, false);
		const ours = syncAutonomy(text, false, true);

		// Assert
		expect(theirs).toEqual({ text, owned: false });
		expect(deny(ours.text)).toBeUndefined();
		expect(ours.owned).toBe(false);
		expect(ours.notice).toBe(AUTONOMY_OFF);
	});

	test("a file that holds no JSON object is left alone", () => {
		// Act and Assert
		expect(syncAutonomy("[]", true, false)).toEqual({
			text: "[]",
			owned: false
		});
	});
});

describe("autonomy at session start", () => {
	test("semi, the default, removes the key a full session wrote and clears the mark", async ($, on) => {
		// Arrange
		const writes: string[] = [];
		const logged: string[] = [];
		const store = new Map<string, unknown>([[AUTONOMY_MARK, true]]);
		on("session.start", (_$, e) => ({ cwd: e.cwd }));
		on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
		on("env.get", (_$, e) => ({
			value: e.name === "HOME" ? "/home/u" : undefined
		}));
		on("settings.read", () => ({ value: {} }));
		on("fs.exists", () => ({ value: true }));
		on("fs.read", () => ({
			value: '{"permissions": {"denyInsteadOfPrompting": true}}'
		}));
		on("fs.write", (_$, e) => {
			writes.push(e.text);
			return { value: undefined };
		});
		on("store.get", (_$, e) => ({ value: store.get(e.key) }));
		on("store.set", (_$, e) => {
			store.set(e.key, e.value);
			return { value: undefined };
		});
		on("ui.log", (_$, e) => {
			logged.push(e.text);
			return { value: undefined };
		});

		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(writes.length).toBeGreaterThan(0);
		expect(deny(writes.at(-1) ?? "{}")).toBeUndefined();
		expect(store.get(AUTONOMY_MARK)).toBe(false);
		expect(logged).toContain(AUTONOMY_OFF);
	});
});
