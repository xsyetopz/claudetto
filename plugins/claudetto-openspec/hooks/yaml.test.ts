import { expect, test } from "claude-code/testing";
import { parseYaml } from "./yaml.ts";

test("Reads the keys a change file uses", () => {
	expect(
		parseYaml("schema: spec-driven\ncreated: 2026-01-01\nskip_specs: true\n"),
	).toEqual({
		schema: "spec-driven",
		created: "2026-01-01",
		skip_specs: true,
	});
});

test("Keeps x- keys and quoted values", () => {
	expect(parseYaml('x-owner: "me: here"\nschema: spec-driven\n')).toEqual({
		"x-owner": "me: here",
		schema: "spec-driven",
	});
});

test("A list is no map, an unclosed flow is invalid", () => {
	expect(parseYaml("- a\n")).toBeNull();
	expect(parseYaml("")).toEqual({});
	expect(parseYaml("schema: [unclosed\n")).toBeUndefined();
});
