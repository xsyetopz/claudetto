import { expect, test } from "claude-code/testing";

import { isWriter } from "./tools.ts";

test("the three file-writing tools are writers, and a reader or Bash is none", () => {
	const names = ["Edit", "NotebookEdit", "Write", "Read", "Bash", "MultiEdit"];
	expect(names.filter((name) => isWriter(name))).toEqual([
		"Edit",
		"NotebookEdit",
		"Write",
	]);
});
