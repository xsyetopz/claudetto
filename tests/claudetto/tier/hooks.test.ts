import { describe, expect, test } from "bun:test";
import {
	differencesOf,
	setupWrite,
} from "../../../plugins/claudetto/src/blocks/setup-command/diff.ts";
import {
	diffReply,
	platformNamed,
	setupReport,
} from "../../../plugins/claudetto/src/blocks/setup-command/setup.ts";
import { refusedNames } from "../../../plugins/claudetto/src/refused.ts";
import {
	groupedKeys,
	KEY_GROUPS,
	keyPaths,
} from "../../../plugins/claudetto/src/tiers/groups.ts";
import { refusedPaths } from "../../../plugins/claudetto/src/tiers/keys.ts";
import {
	tierSnippet,
	UNKNOWN_PLATFORM,
} from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { SNIPPET_ROW } from "../../../plugins/claudetto/src/tiers/tiers.ts";

// The snippet needs a platform named; `"darwin"` carries its `sandbox` block.
const PLATFORM = "darwin";

/** Compares two key names, because a sort with no comparator sorts by UTF-16 code unit. */
const byName = (a: string, b: string): number => a.localeCompare(b);

/** Narrows a settings value to an object, so that a nested key can be read without an `as` assertion. */
const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const snippet = (): Record<string, unknown> => ({
	...tierSnippet(SNIPPET_ROW, PLATFORM),
});

describe("the groups the differences are named by", () => {
	test("every key of the snippet sits in exactly one group", () => {
		const keys = [...keyPaths(snippet())].sort(byName);

		expect([...groupedKeys()].sort(byName)).toStrictEqual(keys);
	});

	test("no key is carried by two groups", () => {
		const keys = groupedKeys();

		expect(new Set(keys).size).toBe(keys.length);
	});

	test("`autoMode` is offered with the sandbox, now that it holds no fact of this repository", () => {
		expect(
			KEY_GROUPS.find((group) => group.keys.includes("autoMode"))?.label,
		).toBe("Sandbox and auto mode");
	});
});

describe("the platform the command composes for", () => {
	test("`uname -s` of a supported platform is named as `process.platform` spells it", () => {
		expect([platformNamed("Darwin\n"), platformNamed("Linux\n")]).toStrictEqual(
			["darwin", "linux"],
		);
	});

	test("an answer the table does not hold, and the empty answer of a failed run, are unknown", () => {
		expect([platformNamed("MINGW64_NT-10.0"), platformNamed("")]).toStrictEqual(
			[UNKNOWN_PLATFORM, UNKNOWN_PLATFORM],
		);
	});

	test("an unknown platform offers no `sandbox.enabled` and no sandbox toggle, so no key claims a sandbox that is not there", () => {
		const ids = differencesOf(
			{},
			{ ...tierSnippet(SNIPPET_ROW, UNKNOWN_PLATFORM) },
		).map((d) => d.id);

		expect(ids.filter((id) => id.startsWith("sandbox.enabled"))).toEqual([]);
		expect(ids.filter((id) => id.includes("="))).toEqual([]);
		expect(ids).toContain("sandbox.allowUnsandboxedCommands");
	});
});

const everyId = (): readonly string[] =>
	differencesOf({}, snippet())
		.map((d) => d.id)
		.filter((id) => !id.includes("="));

describe("what the command writes", () => {
	test("a key of `refused.ts` is written for no one", () => {
		const { applied } = setupWrite({}, snippet(), everyId());

		const env = applied.settings["env"];
		const names = isObject(env) ? Object.keys(env) : [];
		const written = refusedNames().filter(
			(name) => name in applied.settings || names.includes(name),
		);
		expect(written).toStrictEqual([]);
	});

	test("keeping every difference writes every key that is offered", () => {
		const { applied } = setupWrite({}, snippet(), everyId());

		expect([...keyPaths(applied.settings)].sort(byName)).toStrictEqual(
			[...keyPaths(snippet())]
				.filter((path) => !refusedPaths(snippet()).includes(path))
				.sort(byName),
		);
	});
});

const FILE = "/home/u/.claude/settings.json";

describe("the report the tool returns", () => {
	// A hooks module cannot reach `.claude.json`, so the tool reads no plan and composes from `SNIPPET_ROW`.
	test("it names no tier, because the tool reads no plan", () => {
		const report = setupReport(FILE, setupWrite({}, snippet(), ["model"]));

		expect(report).not.toContain("Tier:");
		expect(report).toContain(`Wrote ${FILE}.`);
	});

	test("a refused id is named, and a write of nothing leaves the file unchanged", () => {
		const report = setupReport(FILE, setupWrite({}, snippet(), ["no.such"]));

		expect(report).toContain("Refused no.such");
		expect(report).toContain(`${FILE} was not changed.`);
	});

	test("a read with no difference says there is nothing to ask", () => {
		expect(diffReply(FILE, [])).toContain("nothing to ask");
	});
});
