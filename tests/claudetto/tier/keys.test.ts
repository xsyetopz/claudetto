// A settings key is checked against the vendored settings schema and an `env` name against the
// installed program, because the schema enumerates no environment variable.

import { describe, expect, test } from "bun:test";
import {
	envKeyNames,
	settingsKeyNames,
} from "../../../plugins/claudetto/src/tiers/keys.ts";
import {
	type TierSnippet,
	tierSnippet,
} from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { TIERS } from "../../../plugins/claudetto/src/tiers/tiers.ts";
import { installedProgram, stringsMissing } from "../../../tools/installed.ts";
import { schemaOf } from "../../../tools/settings-schema.ts";

// The program `claude` resolves to, or an empty path on a machine with no CLI, where the cases that
// read it skip.
const PROGRAM = (await installedProgram()) ?? "";

const PLANTED = "CLAUDETTO_NOT_A_CLAUDE_KEY";

// The snippet needs a platform named; `"darwin"` is the development platform, so the snippet carries its `sandbox` block.
const PLATFORM = "darwin";

// Every row with both model fields filled, so the keys a row sets only when it names a model are
// checked too.
const SNIPPETS = TIERS.map((row) =>
	tierSnippet(
		{
			...row,
			subagentModel: "claude-haiku-5-5",
			mainModel: "claude-haiku-5-5",
		},
		PLATFORM,
	),
);

const namesOf = (
	pick: (snippet: TierSnippet) => readonly string[],
): readonly string[] => [...new Set(SNIPPETS.flatMap(pick))];

/** The names of `names` the schema does not hold, which is what each case below asserts on. */
const unknownIn = (
	keys: readonly string[],
	names: readonly string[],
): readonly string[] => names.filter((name) => !keys.includes(name));

describe("every settings key a row writes is one Claude Code reads", () => {
	test("the vendored schema holds each of them", async () => {
		const { keys } = await schemaOf("settings");

		expect(unknownIn(keys, namesOf(settingsKeyNames))).toEqual([]);
	});

	test("a snippet carrying a key the schema lacks is reported", async () => {
		const { keys } = await schemaOf("settings");
		const planted = SNIPPETS.map((snippet) => ({ ...snippet, [PLANTED]: 1 }));

		const unknown = unknownIn(keys, [
			...new Set(planted.flatMap(settingsKeyNames)),
		]);

		expect(unknown).toEqual([PLANTED]);
	});

	test("no row writes a key only an administrator can set", async () => {
		const { managedOnly } = await schemaOf("managed");

		const written = namesOf(settingsKeyNames).filter((name) =>
			managedOnly.includes(name),
		);

		// `disableSideloadFlags` is one of them, so the list is not empty and the case is not vacuous.
		expect(managedOnly).toContain("disableSideloadFlags");
		expect(written).toEqual([]);
	});

	test("a snippet carrying a managed-only key is reported", async () => {
		const { managedOnly } = await schemaOf("managed");
		const planted = SNIPPETS.map((snippet) => ({
			...snippet,
			disableSideloadFlags: true,
		}));

		const written = [...new Set(planted.flatMap(settingsKeyNames))].filter(
			(name) => managedOnly.includes(name),
		);

		expect(written).toEqual(["disableSideloadFlags"]);
	});
});

describe.skipIf(PROGRAM === "")("the env names a row writes", () => {
	test("the installed program holds each of them", async () => {
		expect(await stringsMissing(PROGRAM, namesOf(envKeyNames))).toEqual([]);
	});

	test("a name the program lacks is reported", async () => {
		expect(await stringsMissing(PROGRAM, [PLANTED])).toEqual([PLANTED]);
	});
});
