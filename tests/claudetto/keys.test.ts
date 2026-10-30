import { describe, expect, test } from "bun:test";
import {
	COMPACTION_KEYS,
	compactionSnippet,
	ENV,
	snippetTriggerTokens,
	unsetKeys,
	writtenKeys,
} from "../../plugins/claudetto/src/keys.ts";
import { HANDOFF_TRIGGER_TOKENS } from "../../plugins/claudetto/src/threshold.ts";
import { installedProgram, stringsMissing } from "../../tools/installed.ts";
import { keysMissing } from "../../tools/settings-schema.ts";

// The program `claude` resolves to, or an empty path on a machine with no CLI, where the case that
// reads it skips. A settings key goes to the schema instead, which says what Claude Code reads
// rather than what bytes the build happens to hold.
const PROGRAM = (await installedProgram()) ?? "";

describe("every compaction key is one Claude Code reads", () => {
	test("a vendored schema holds each settings key", async () => {
		const names = COMPACTION_KEYS.filter((row) => row.kind !== ENV).map(
			(row) => row.name,
		);

		expect(await keysMissing(names)).toEqual([]);
	});

	test("the schemas do not hold a key that is not theirs", async () => {
		expect(await keysMissing(["CLAUDETTO_NOT_A_CLAUDE_KEY"])).toEqual([
			"CLAUDETTO_NOT_A_CLAUDE_KEY",
		]);
	});
});

describe.skipIf(PROGRAM === "")(
	"every compaction env name is in the program",
	() => {
		test("the program holds each of them", async () => {
			const names = COMPACTION_KEYS.filter((row) => row.kind === ENV).map(
				(row) => row.name,
			);

			expect(await stringsMissing(PROGRAM, names)).toEqual([]);
		});

		test("the search reports a name the program does not hold", async () => {
			const missing = await stringsMissing(PROGRAM, [
				"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
				"CLAUDETTO_NOT_A_CLAUDE_KEY",
			]);

			expect(missing).toEqual(["CLAUDETTO_NOT_A_CLAUDE_KEY"]);
		});
	},
);

describe("the rows are a list of distinct keys", () => {
	test("no key is listed twice", () => {
		const names = COMPACTION_KEYS.map((row) => row.name);

		expect(new Set(names).size).toBe(names.length);
	});
});

describe("the snippet claudetto writes", () => {
	test("it is the percentage, the window, and idle compaction off", () => {
		expect(compactionSnippet()).toEqual({
			env: { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "50.0000" },
			settings: { autoCompactWindow: 300_000, idleCompaction: false },
		});
	});

	test("it puts the harness's compaction at the handoff trigger", () => {
		expect(snippetTriggerTokens()).toBe(HANDOFF_TRIGGER_TOKENS);
	});

	test("the keys it leaves alone are the idle, duplicate, and unpriced ones", () => {
		expect(unsetKeys().map((row) => row.name)).toEqual([
			"CLAUDE_CODE_SLEEP_COMPACT",
			"CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS",
			"CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS",
			"CLAUDE_CODE_AUTO_COMPACT_WINDOW",
			"autoCompactEnabled",
			"precomputeCompactionEnabled",
		]);
	});

	test("an environment key reaches the environment block and a setting does not", () => {
		const envRows = writtenKeys().filter((row) => row.kind === ENV);
		const snippet = compactionSnippet();

		expect(envRows.map((row) => row.name)).toEqual(Object.keys(snippet.env));
		expect(Object.keys(snippet.settings)).not.toContain(
			"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
		);
	});
});
