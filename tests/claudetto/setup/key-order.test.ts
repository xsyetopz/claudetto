// The keys of the settings snippet are in the order of the properties of the settings schema (the user, 2026-10-22).
// A key that the schema copy lacks has no position, so the test skips it.
// The `env` order comes from the `configure/env-vars` pages of `claude-code-docs`, which a test cannot read offline.

import { expect, test } from "bun:test";
import { isObject } from "../../../plugins/claudetto/modules/setup/domain/merge.ts";
import { SNIPPET } from "../../../plugins/claudetto/modules/setup/prompts.ts";
import { SCHEMA } from "../../support/settings-pin.ts";

interface Node {
	properties?: Record<string, Node>;
}

/** The keys of `object` that `schema` names, in the order of `object`. */
const known = (object: object, schema: Node): string[] =>
	Object.keys(object).filter((key) =>
		Object.hasOwn(schema.properties ?? {}, key),
	);

/** The keys of `object` that `schema` names, in the order of `schema`. */
const sorted = (object: object, schema: Node): string[] => {
	const order = Object.keys(schema.properties ?? {});
	return known(object, schema).sort(
		(a, b) => order.indexOf(a) - order.indexOf(b),
	);
};

const snippet: Record<string, unknown> = SNIPPET;

test("the top-level keys of the snippet are in the order of the schema", () => {
	expect(known(snippet, SCHEMA)).toStrictEqual(sorted(snippet, SCHEMA));
});

test("the keys in each object of the snippet are in the order of the schema", () => {
	const pairs = Object.entries(snippet).flatMap(([key, value]) => {
		const node: Node | undefined = SCHEMA.properties[key];
		return node?.properties && isObject(value)
			? [{ key, actual: known(value, node), expected: sorted(value, node) }]
			: [];
	});
	expect(pairs.map(({ key, actual }) => [key, ...actual])).toStrictEqual(
		pairs.map(({ key, expected }) => [key, ...expected]),
	);
});
