import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { isRecord } from "../../settings/settings";
import { RETIRED_NOTICE, retireDenyKey, WROTE_MARK } from "../autonomy";

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

describe("retiring the key claudetto wrote", () => {
	test("mark set and key true: the key goes, other permissions stay, a notice shows", () => {
		// Arrange
		const text =
			'{"permissions": {"allow": ["Read"], "denyInsteadOfPrompting": true}}';

		// Act
		const retired = retireDenyKey(text, true);

		// Assert
		expect(deny(retired.text)).toBeUndefined();
		expect(allow(retired.text)).toEqual(["Read"]);
		expect(retired.owned).toBe(false);
		expect(retired.notice).toBe(RETIRED_NOTICE);
	});

	test("no mark: a key the person set is untouched", () => {
		// Arrange
		const text = '{"permissions": {"denyInsteadOfPrompting": true}}';

		// Act and Assert
		expect(retireDenyKey(text, false)).toEqual({ text, owned: false });
	});

	test("mark set and key absent: the mark clears and nothing is written", () => {
		// Arrange
		const text = '{"permissions": {"allow": ["Read"]}}';

		// Act and Assert
		expect(retireDenyKey(text, true)).toEqual({ text, owned: false });
	});

	test("mark set and key changed by the person: the value stays and the mark clears", () => {
		// Arrange
		const text = '{"permissions": {"denyInsteadOfPrompting": false}}';

		// Act and Assert
		expect(retireDenyKey(text, true)).toEqual({ text, owned: false });
	});

	test("a file that holds no JSON object is left alone", () => {
		// Act and Assert
		expect(retireDenyKey("[]", true)).toEqual({ text: "[]", owned: false });
	});
});

/** Serves a settings file and a store mark to a session start; records writes, logs, stores. */
const serve = (on: On, file: string, mark: true | null) => {
	const writes: string[] = [];
	const logged: string[] = [];
	const store = new Map<string, unknown>([[WROTE_MARK, mark]]);
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
	on("ui.log", (_$, e) => {
		logged.push(e.text);
		return { value: undefined };
	});
	return { writes, logged, store };
};

describe("cleanup at session start", () => {
	test("mark set and key true: removes the key, clears the mark, shows the notice", async ($, on) => {
		// Arrange
		const { writes, logged, store } = serve(
			on,
			'{"permissions": {"denyInsteadOfPrompting": true}}',
			true
		);
		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(writes.length).toBeGreaterThan(0);
		expect(deny(writes.at(-1) ?? "{}")).toBeUndefined();
		expect(store.get(WROTE_MARK)).toBe(false);
		expect(logged).toContain(RETIRED_NOTICE);
	});

	test("no mark: the key stays and no notice shows", async ($, on) => {
		// Arrange
		const { writes, logged } = serve(
			on,
			'{"permissions": {"denyInsteadOfPrompting": true}}',
			null
		);
		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		for (const text of writes) {
			expect(deny(text)).toBe(true);
		}
		expect(logged).not.toContain(RETIRED_NOTICE);
	});

	test("mark set and key absent: the mark clears and the cleanup writes nothing", async ($, on) => {
		// Arrange
		const { writes, logged, store } = serve(on, '{"permissions": {}}', true);
		// Act
		await $.session.start({
			cwd: "/home/u/p",
			surface: null,
			isInteractive: true
		});

		// Assert
		expect(store.get(WROTE_MARK)).toBe(false);
		expect(logged).not.toContain(RETIRED_NOTICE);
		for (const text of writes) {
			expect(deny(text)).toBeUndefined();
		}
	});
});
