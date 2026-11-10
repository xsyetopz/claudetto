import { expect, test } from "claude-code/testing";

import { ANY_TOOL, isWriter } from "./tools.ts";

test("the pattern for every tool matches each tool name, as `/./u` does", () => {
	for (const name of ["Bash", "Edit", "Agent", "mcp__server__tool", "a"]) {
		expect(ANY_TOOL.test(name)).toBe(true);
		expect(/./u.test(name)).toBe(true);
	}
});

test("the three file-writing tools are writers, and a reader or Bash is none", () => {
	const names = ["Edit", "NotebookEdit", "Write", "Read", "Bash", "MultiEdit"];
	expect(names.filter((name) => isWriter(name))).toEqual([
		"Edit",
		"NotebookEdit",
		"Write",
	]);
});
