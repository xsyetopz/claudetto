import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { file } from "bun";
import { UNOFFICIAL_ENV } from "../env.ts";
import { envKeyNames, settingsKeyNames } from "../keys.ts";
import { tierSnippet } from "../snippet.ts";
import { TIERS } from "../tiers.ts";

const KEEP = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"..",
	"..",
	"docs",
	"keep",
	"settings",
);

const schema: unknown = await file(
	join(KEEP, "claude-code-settings.schema.json"),
).json();
const properties =
	typeof schema === "object" && schema !== null && "properties" in schema
		? schema.properties
		: undefined;
const schemaKeys =
	typeof properties === "object" && properties !== null
		? Object.keys(properties)
		: [];

const documentedEnv = (await file(join(KEEP, "env-documented.txt")).text())
	.split("\n")
	.filter((line) => line !== "" && !line.startsWith("#"));

const unofficial = UNOFFICIAL_ENV.map((entry) => entry.name);

describe("tier snippet keys", () => {
	for (const row of TIERS) {
		const snippet = tierSnippet(row, "darwin");

		test(`${row.tier}: every settings key is in the vendored schema`, () => {
			const unknown = settingsKeyNames(snippet).filter(
				(key) => !schemaKeys.includes(key),
			);

			expect(unknown).toEqual([]);
		});

		test(`${row.tier}: every env name is documented or listed as unofficial`, () => {
			const unknown = envKeyNames(snippet).filter(
				(name) => !documentedEnv.includes(name) && !unofficial.includes(name),
			);

			expect(unknown).toEqual([]);
		});
	}

	test("each unofficial name names its source", () => {
		const bare = UNOFFICIAL_ENV.filter((entry) => entry.source.trim() === "");

		expect(bare).toEqual([]);
	});
});
