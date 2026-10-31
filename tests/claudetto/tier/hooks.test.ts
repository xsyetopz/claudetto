import { describe, expect, test } from "bun:test";
import {
	chosenGroups,
	platformNamed,
	setupReport,
} from "../../../plugins/claudetto/src/blocks/setup-command/setup.ts";
import { refusedNames } from "../../../plugins/claudetto/src/refused.ts";
import {
	groupedKeys,
	groupLabels,
	KEY_GROUPS,
	keptSnippet,
	keyPaths,
} from "../../../plugins/claudetto/src/tiers/groups.ts";
import { refusedPaths } from "../../../plugins/claudetto/src/tiers/keys.ts";
import { applyTier } from "../../../plugins/claudetto/src/tiers/merge.ts";
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

describe("the groups the dialog offers", () => {
	test("the table holds the two to four options `$.ui.ask` accepts", () => {
		expect(KEY_GROUPS.length).toBeGreaterThanOrEqual(2);
		expect(KEY_GROUPS.length).toBeLessThanOrEqual(4);
	});

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

	test("keeping every group keeps every key that is offered", () => {
		const kept = keptSnippet(snippet(), groupLabels());

		expect([...keyPaths(kept)].sort(byName)).toStrictEqual(
			[...groupedKeys()].sort(byName),
		);
	});

	test("keeping no group keeps no key", () => {
		expect(keptSnippet(snippet(), [])).toStrictEqual({});
	});

	test("keeping one group keeps its keys and no other", () => {
		const group = KEY_GROUPS[1];
		if (group === undefined) {
			throw new Error("the table has a second group");
		}

		const kept = keptSnippet(snippet(), [group.label]);

		expect([...keyPaths(kept)].sort(byName)).toStrictEqual(
			[...group.keys].sort(byName),
		);
	});
});

describe("the answer of the dialog", () => {
	test("a multi-select answer comes back comma-joined and names its groups", () => {
		const labels = groupLabels();

		expect(chosenGroups(labels.join(","))).toStrictEqual(labels);
	});

	test("a label with spaces around it is still its group", () => {
		const first = groupLabels()[0] ?? "";

		expect(chosenGroups(` ${first} `)).toStrictEqual([first]);
	});

	test("free text typed under the dialog's Other names no group", () => {
		expect(chosenGroups("something else")).toStrictEqual([]);
	});

	test("an empty answer, which is a dismissed dialog, names no group", () => {
		expect(chosenGroups("")).toStrictEqual([]);
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

	test("an unknown platform writes no `sandbox.enabled`, so no key claims a sandbox that is not there", () => {
		const kept = keptSnippet(
			{ ...tierSnippet(SNIPPET_ROW, UNKNOWN_PLATFORM) },
			["Sandbox and auto mode"],
		);

		const sandbox = kept["sandbox"];
		if (!isObject(sandbox)) {
			throw new Error("the sandbox group keeps a `sandbox` object");
		}
		expect(sandbox["enabled"]).toBeUndefined();
		expect(sandbox["allowUnsandboxedCommands"]).toBe(false);
	});
});

describe("what the command writes", () => {
	test("a value the user set keeps its value", () => {
		const held = { outputStyle: "Explanatory" };
		const kept = keptSnippet(snippet(), groupLabels());

		const applied = applyTier(held, kept, refusedPaths(kept));

		expect(applied.settings["outputStyle"]).toBe("Explanatory");
	});

	test("a key of `refused.ts` is written for no one", () => {
		const kept = keptSnippet(snippet(), groupLabels());

		const applied = applyTier({}, kept, refusedPaths(kept));

		const env = applied.settings["env"];
		const names = isObject(env) ? Object.keys(env) : [];
		const written = refusedNames().filter(
			(name) => name in applied.settings || names.includes(name),
		);
		expect(written).toStrictEqual([]);
	});

	test("a discarded group leaves the settings without its keys", () => {
		const kept = keptSnippet(snippet(), ["Sandbox and auto mode"]);

		const applied = applyTier({}, kept, refusedPaths(kept));

		expect(applied.settings["sandbox"]).toBeDefined();
		expect(applied.settings["outputStyle"]).toBeUndefined();
	});
});

describe("the report the command returns", () => {
	const reportFor = (labels: readonly string[]): string => {
		const kept = keptSnippet(snippet(), labels);
		return setupReport("/home/u/.claude/settings.json", labels, {
			...applyTier({}, kept, refusedPaths(kept)),
		});
	};

	// A hooks module cannot reach `.claude.json`, so the command reads no plan and composes from `SNIPPET_ROW`.
	test("it names no tier, because the command reads no plan", () => {
		for (const labels of [[], ["Sandbox and auto mode"], groupLabels()]) {
			expect(reportFor(labels)).not.toContain("Tier:");
		}
	});

	test("the row's own tier is printed by no choice of groups", () => {
		for (const labels of [[], ["Sandbox and auto mode"], groupLabels()]) {
			expect(reportFor(labels)).not.toContain(SNIPPET_ROW.tier);
		}
	});

	// `why` is the only place a user reads what a group does: the dialog shows labels, not descriptions.
	test("a discarded group is named with what keeping it would have done", () => {
		const report = reportFor(["Sandbox and auto mode"]);

		for (const group of KEY_GROUPS.filter(
			(entry) => entry.label !== "Sandbox and auto mode",
		)) {
			expect(report).toContain(`Discarded ${group.label}`);
			expect(report).toContain(group.why);
		}
	});

	test("a kept group is named in no discarded line", () => {
		expect(reportFor(["Sandbox and auto mode"])).not.toContain(
			"Discarded Sandbox",
		);
		expect(reportFor(groupLabels())).not.toContain("Discarded");
	});
});
