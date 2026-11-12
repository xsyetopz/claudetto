import { expect, test } from "claude-code/testing";

import { parseYaml } from "./yaml";

const logs: string[] = [];
const log = (message: string) => {
	logs.push(message);
};

test("Reads the keys a change file uses", () => {
	expect(
		parseYaml(
			"schema: spec-driven\ncreated: 2026-01-01\nskip_specs: true\n",
			log,
		),
	).toEqual({
		schema: "spec-driven",
		created: "2026-01-01",
		skip_specs: true,
	});
});

test("Keeps x- keys and quoted values", () => {
	expect(parseYaml('x-owner: "me: here"\nschema: spec-driven\n', log)).toEqual({
		"x-owner": "me: here",
		schema: "spec-driven",
	});
});

test("A list is no map, an unclosed flow is invalid", () => {
	expect(parseYaml("- a\n", log)).toBeNull();
	expect(parseYaml("", log)).toEqual({});
	expect(parseYaml("schema: [unclosed\n", log)).toBeUndefined();
});

test("A quoted value that does not parse is logged and invalid", () => {
	logs.length = 0;
	expect(parseYaml('schema: "unclosed\n', log)).toBeUndefined();
	expect(logs[0]).toContain("did not parse");
});
