import { expect, test } from "claude-code/testing";

import { applyChanges, changesOf, linkGroup, tempGroup } from "./changes";
import { type Json, valueAt } from "./settings";

const linked = (held: Json, folders: readonly string[]): unknown => {
	const group = linkGroup(folders);
	return group === undefined
		? undefined
		: valueAt(applyChanges(held, changesOf(held, group), "fill"), [
				"worktree",
				"symlinkDirectories",
			]);
};

test("a worktree link list keeps the user's folders and adds ours once", () => {
	const held = { worktree: { symlinkDirectories: ["mine", "node_modules"] } };

	expect(linked(held, ["node_modules", ".venv"])).toEqual([
		"mine",
		"node_modules",
		".venv",
	]);
});

test("no folder makes no link group", () => {
	expect(linkGroup([])).toBeUndefined();
});

test("the temp folder rules name the uid, under /tmp and /private/tmp", () => {
	expect(tempGroup("501").settings).toEqual({
		permissions: {
			allow: ["Edit(//tmp/claude-501/**)", "Edit(//private/tmp/claude-501/**)"],
		},
	});
});
