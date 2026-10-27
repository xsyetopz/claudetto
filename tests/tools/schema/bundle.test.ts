// The shipped schemas against the bundle of the installed `claude`.
// The tests skip when `claude` is not on `PATH`, and they run in the lab.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, which } from "bun";
import {
	installedBundle,
	versionOf,
} from "../../../dev/schema/adapters/cli.ts";
import {
	buildSchemas,
	schemaFiles,
	unreadKeys,
} from "../../../dev/schema/domain/build.ts";
import type { Schema } from "../../../dev/schema/domain/types.ts";
import { BUNDLE_SCAN_TIMEOUT_MS } from "../../../tools/limits.ts";
import { REPO } from "../../support/repo.ts";

const installed = async (): Promise<string | null> =>
	which("claude") ? await installedBundle() : null;

const shipped = async (kind: "user" | "managed"): Promise<Schema> => {
	const schema: Schema = JSON.parse(
		await bunFile(path.join(REPO, "schemas", schemaFiles()[kind])).text(),
	);
	return schema;
};

// The bundle is read as latin1, as the command reads it.
const bundleText = async (file: string): Promise<string> =>
	Buffer.from(await bunFile(file).arrayBuffer()).toString("latin1");

test(
	"each key in `schemas/` is a key that the installed binary reads",
	async () => {
		const bundle = await installed();
		// Without an installed `claude` there is no bundle to read, so the test has nothing to check.
		if (bundle === null) {
			return;
		}
		const built = buildSchemas(
			await bundleText(bundle),
			await versionOf(bundle),
		);
		expect(unreadKeys(await shipped("user"), built.user)).toStrictEqual([]);
		expect(unreadKeys(await shipped("managed"), built.managed)).toStrictEqual(
			[],
		);
	},
	BUNDLE_SCAN_TIMEOUT_MS,
);

test("`unreadKeys` names each shipped key that the built schema lacks, at any depth", () => {
	const built: Schema = {
		properties: { a: { properties: { x: {} } } },
	};
	const shippedSchema: Schema = {
		properties: {
			a: { properties: { x: {}, gone: {} } },
			b: {},
		},
	};
	expect(unreadKeys(shippedSchema, built)).toStrictEqual(["a.gone", "b"]);
	expect(unreadKeys(built, built)).toStrictEqual([]);
});

test("each top-level key of the shipped schemas has a description", async () => {
	const kinds = ["user", "managed"] as const;
	const schemas = await Promise.all(kinds.map((kind) => shipped(kind)));
	for (const [i, schema] of schemas.entries()) {
		for (const [key, sub] of Object.entries(schema.properties ?? {})) {
			expect(sub.description, `${kinds[i]}: ${key}`).toBeTruthy();
		}
	}
});
