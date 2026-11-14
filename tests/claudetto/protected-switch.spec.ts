import { expect, test } from "bun:test";

import { movesOf } from "../../plugins/claudetto/scripts/protected-switch";

for (const command of [
	"git checkout -- src/a.ts",
	"git rebase --continue",
	"git reset --soft HEAD~1",
	"git switch -c fresh",
	"git status",
	"ls",
	"",
]) {
	test(`"${command}" moves no tree`, () => {
		expect(movesOf(command)).toEqual([]);
	});
}
