// The two manifests of the new tree, checked against the code and the disk: the option the plugin
// offers is the value list the resolver knows, so a new value cannot be declared without a code
// path for it, and every plugin the marketplace lists is a folder that exists with a manifest of
// its own.

import { describe, expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import marketplace from "../../.claude-plugin/marketplace.json";
import plugin from "../../plugins/claudetto/.claude-plugin/plugin.json";
import {
	AUTO,
	COMPACTION_OPTION,
	COMPACTION_VALUES,
} from "../../plugins/claudetto/src/compaction/compaction.ts";
import observer from "../../plugins/claudetto-you-should-know/.claude-plugin/plugin.json";
import {
	DEFAULT_EFFORT,
	DEFAULT_MODEL,
} from "../../plugins/claudetto-you-should-know/src/options.ts";

const MANIFEST = join(".claude-plugin", "plugin.json");

/** Whether the path is a file that can be read, with a missing path answering false. */
const isFile = async (path: string): Promise<boolean> => {
	try {
		return (await stat(path)).isFile();
	} catch {
		return false;
	}
};

describe("the plugin manifest against the resolver", () => {
	test("the option offers the resolver's own value list", () => {
		const declared = plugin.userConfig[COMPACTION_OPTION].options;

		expect(declared).toEqual([...COMPACTION_VALUES]);
	});

	test("the default is the value that defers to the measurement", () => {
		const fallback = plugin.userConfig[COMPACTION_OPTION].default;

		expect(fallback).toBe(AUTO);
	});
});

// A `default` in the manifest reaches the hook as the option's value, so the code fallback fires only
// where the manifest declares none. Where both exist and disagree, the manifest decides and the code
// constant describes a default nobody gets, which is how `effort` came to say `medium` in the
// manifest and `high` in the code while both cited the same row of `docs/models.md`.
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
