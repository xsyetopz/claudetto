import { describe, expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import marketplace from "../../.claude-plugin/marketplace.json";
import plugin from "../../plugins/claudetto/.claude-plugin/plugin.json";
import observer from "../../plugins/claudetto-you-should-know/.claude-plugin/plugin.json";
import {
	DEFAULT_EFFORT,
	DEFAULT_MODEL,
} from "../../plugins/claudetto-you-should-know/src/options.ts";

const MANIFEST = join(".claude-plugin", "plugin.json");

const declaredOptions = (manifest: { userConfig: object }): readonly string[] =>
	Object.keys(manifest.userConfig);

const isFile = async (path: string): Promise<boolean> => {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
};

// The list is pinned, not derived: searching the source for a name proves no hook reads it.
const OPTIONS: readonly string[] = [
	"decide",
	"TYPESAFE_API_KEY",
	"cheapSummary",
	"subagentCap",
	"startCap",
	"windowSeconds",
	"callCap",
	"heavyTokens",
	"failLimit",
];

describe("the options the manifest offers", () => {
	test("the manifest declares the pinned list and nothing more", () => {
		expect(declaredOptions(plugin)).toEqual([...OPTIONS]);
	});
});

// A manifest `default` reaches the hook as the value, so the code fallback fires only without one.
describe("the add-on manifest against its own constants", () => {
	test("the declared effort default is the constant the code falls back to", () => {
		const declared = observer.userConfig["effort"].default;

		expect(declared).toBe(DEFAULT_EFFORT);
	});

	test("the declared model default is the constant the code falls back to", () => {
		const declared = observer.userConfig["model"].default;

		expect(declared).toBe(DEFAULT_MODEL);
	});

	test("the declared effort list is the five levels the code accepts", () => {
		const declared = observer.userConfig["effort"].options;

		expect(declared).toEqual(["low", "medium", "high", "xhigh", "max"]);
	});
});

describe("the marketplace manifest against the disk", () => {
	test("each listed source is a folder holding its own manifest", async () => {
		const sources = marketplace.plugins.map((entry) => entry.source);

		const read = await Promise.all(
			sources.map(async (source) => ({
				source,
				manifest: await isFile(join(source, MANIFEST)),
			})),
		);

		expect(sources.length).toBeGreaterThan(0);
		expect(read).toEqual(sources.map((source) => ({ source, manifest: true })));
	});
});
