import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import type { PluginOptions } from "claude-code";
import {
	TIERS,
	type TierRow,
} from "../../plugins/claudetto/src/tiers/tiers.ts";
import {
	DEFAULT_EFFORT,
	DEFAULT_MODEL,
	keptSettings,
	settingsOf,
} from "../../plugins/claudetto-you-should-know/src/options.ts";

const MANIFEST = "plugins/claudetto-you-should-know/.claude-plugin/plugin.json";

const userConfig = async (): Promise<Record<string, PluginOptions>> => {
	const text = await readFile(MANIFEST, "utf8");
	return JSON.parse(text).userConfig;
};

describe("the installed observer is off", () => {
	test("no options at all leaves it off", () => {
		expect(settingsOf({}).enabled).toBe(false);
	});

	test("before `register` runs it is off", () => {
		expect(keptSettings().enabled).toBe(false);
	});

	test("only `true` turns it on, and no other value does", () => {
		expect([
			settingsOf({ enabled: true }).enabled,
			settingsOf({ enabled: "true" }).enabled,
			settingsOf({ enabled: 1 }).enabled,
			settingsOf({ enabled: false }).enabled,
		]).toEqual([true, false, false, false]);
	});

	test("the shipped manifest defaults it to off", async () => {
		const config = await userConfig();

		expect(config["enabled"]).toMatchObject({
			type: "boolean",
			default: false,
		});
	});

	test("an off plugin still reads the cheap model and effort, so turning it on prices nothing new", () => {
		const off = settingsOf({});

		expect([off.model, off.effort]).toEqual([DEFAULT_MODEL, DEFAULT_EFFORT]);
	});
});

/** A row field whose name would reach this plugin's own `enabled` switch. */
const TURNS_IT_ON = /observer|enabled|shouldKnow/i;

/** A settings value, since `PluginOptions` holds only these. */
const isScalar = (
	entry: readonly [string, unknown],
): entry is readonly [string, string | number | boolean] =>
	typeof entry[1] === "string" ||
	typeof entry[1] === "number" ||
	typeof entry[1] === "boolean";

/** The nested `haiku` object is dropped: no `userConfig` value can hold one. */
const asOptions = (row: TierRow): PluginOptions =>
	Object.fromEntries(Object.entries(row).filter(isScalar));

describe("no tier row prices the observer", () => {
	test("no row holds a field that turns it on", () => {
		const keys = TIERS.flatMap((row) => Object.keys(row));

		expect(keys.filter((key) => TURNS_IT_ON.test(key))).toEqual([]);
	});

	test("every row, read as the observer's own options, leaves it off", () => {
		const read = TIERS.map((row) => settingsOf(asOptions(row)).enabled);

		expect(read).toEqual(TIERS.map(() => false));
	});
});
