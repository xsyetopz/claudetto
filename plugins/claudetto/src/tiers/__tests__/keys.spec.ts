import { describe, expect, test } from "bun:test";
import {
	documentedEnv,
	schemaOf,
} from "../../../../../tools/settings-schema.ts";
import { UNOFFICIAL_ENV } from "../env.ts";
import { envKeyNames, settingsKeyNames } from "../keys.ts";
import { tierSnippet } from "../snippet.ts";
import { TIERS } from "../tiers.ts";

const schemaKeys = (await schemaOf("settings")).keys;

const documented = await documentedEnv();

const unofficial = UNOFFICIAL_ENV.map((entry) => entry.name);

describe("tier snippet keys", () => {
	for (const row of TIERS) {
		const snippet = tierSnippet(row, "darwin");

		test(`${row.tier}: every settings key is in the published schema`, () => {
			const unknown = settingsKeyNames(snippet).filter(
				(key) => !schemaKeys.includes(key),
			);

			expect(unknown).toEqual([]);
		});

		test(`${row.tier}: every env name is documented or listed as unofficial`, () => {
			const unknown = envKeyNames(snippet).filter(
				(name) => !documented.includes(name) && !unofficial.includes(name),
			);

			expect(unknown).toEqual([]);
		});
	}
});
