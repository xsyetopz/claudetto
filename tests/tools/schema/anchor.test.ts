// `findSchemaBody` picks the settings schema when the bundle holds more than one `$schema` thunk object.

import { expect, test } from "bun:test";
import {
	findSchemaBody,
	parseEntries,
} from "../../../dev/schema/domain/scan.ts";

const MANIFEST =
	"{$schema:()=>A().shape.$schema,name:()=>A().shape.name,version:()=>A().shape.version}";
const SETTINGS =
	'{$schema:()=>o().optional().describe("x"),apiKeyHelper:()=>o().optional().describe("a"),permissions:()=>o().optional().describe("p")}';

test("`findSchemaBody` skips a manifest schema that comes before the settings schema", () => {
	const src = `var m=${MANIFEST};var s=${SETTINGS};`;

	const body = findSchemaBody(src) ?? "";

	expect(parseEntries(body, true).map(([key]) => key)).toStrictEqual([
		"$schema",
		"apiKeyHelper",
		"permissions",
	]);
});
