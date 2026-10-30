import { describe, expect, test } from "bun:test";
import {
	compactionSnippet,
	type Snippet,
} from "../../plugins/claudetto/src/keys.ts";
import {
	REFUSED_KEYS,
	refusals,
	refusedNames,
} from "../../plugins/claudetto/src/refused.ts";
import { installedProgram, stringsMissing } from "../../tools/installed.ts";
import { keysMissing } from "../../tools/settings-schema.ts";

const PROGRAM = (await installedProgram()) ?? "";

const snippetOf = (name: string, kind: "env" | "setting"): Snippet =>
	kind === "env"
		? { env: { [name]: "1" }, settings: {} }
		: { env: {}, settings: { [name]: true } };

describe("the snippet claudetto writes holds no refused key", () => {
	test("the shipped snippet passes the check", () => {
		expect(refusals(compactionSnippet())).toEqual([]);
	});

	for (const row of REFUSED_KEYS) {
		test(`${row.name} is named when a snippet holds it`, () => {
			const snippet = snippetOf(row.name, row.kind);

			expect(refusals(snippet)).toEqual([row.name]);
		});
	}

	test("a snippet holding several refused keys names every one", () => {
		const snippet: Snippet = {
			env: { DISABLE_LOGIN_COMMAND: "1" },
			settings: { disableAllHooks: true, autoCompactWindow: 300_000 },
		};

		expect(refusals(snippet)).toEqual([
			"disableAllHooks",
			"DISABLE_LOGIN_COMMAND",
		]);
	});

	test("a refused name written with a harmless value is still named", () => {
		const snippet: Snippet = { env: {}, settings: { disableAllHooks: false } };

		expect(refusals(snippet)).toEqual(["disableAllHooks"]);
	});

	test("the four self-disabling keys of the spec are all refused", () => {
		const names = refusedNames();

		expect(names).toContain("disableAllHooks");
		expect(names).toContain("disableSkillShellExecution");
		expect(names).toContain("disableSideloadFlags");
		expect(names).toContain("disableCommandPluginSources");
	});

	test("the command and updater keys of the spec are all refused", () => {
		const names = refusedNames();

		expect(names).toContain("DISABLE_LOGIN_COMMAND");
		expect(names).toContain("DISABLE_LOGOUT_COMMAND");
		expect(names).toContain("DISABLE_DOCTOR_COMMAND");
		expect(names).toContain("DISABLE_AUTOUPDATER");
		expect(names).toContain("DISABLE_UPDATES");
	});
});

describe("every refused key is a real key", () => {
	// Two of them, `disableSideloadFlags` and `disableCommandPluginSources`, are `x-managed-only`, so
	// the union of the two schemas is the list and the user schema alone would reject them.
	test("a vendored schema holds every refused settings key", async () => {
		const names = REFUSED_KEYS.filter((row) => row.kind !== "env").map(
			(row) => row.name,
		);

		expect(await keysMissing(names)).toEqual([]);
	});
});

describe.skipIf(PROGRAM === "")("every refused env name is a real name", () => {
	test("the installed program holds each of them", async () => {
		const names = REFUSED_KEYS.filter((row) => row.kind === "env").map(
			(row) => row.name,
		);

		expect(await stringsMissing(PROGRAM, names)).toEqual([]);
	});
});

describe("the rows are a list of distinct keys", () => {
	test("no name is refused twice and none is also written", () => {
		const names = refusedNames();
		const written = Object.keys(compactionSnippet().settings);

		expect(new Set(names).size).toBe(names.length);
		expect(names.filter((name) => written.includes(name))).toEqual([]);
	});
});
