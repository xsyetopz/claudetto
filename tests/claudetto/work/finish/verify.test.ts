// The checks of a project for the check before a stop: the `justfile` recipes that `isCheck` accepts, and `bun test` with a `bun.lock`.

import { expect, test } from "bun:test";
import { projectChecks } from "../../../../plugins/claudetto/modules/work/finish/domain/verify.ts";

test("the checks are the check recipes of the `justfile`, and `bun test` with a `bun.lock`", () => {
	const justfile =
		"x := '1'\ncheck-all:\n    a\ntest *args:\n    b\nlint:\n    c\n";

	expect(projectChecks(justfile, true)).toEqual([
		"just test",
		"just lint",
		"bun test",
	]);
});

test("a project with no `justfile` and no `bun.lock` has no checks", () => {
	expect(projectChecks(undefined, false)).toEqual([]);
});
