// The cases that run a command and need no more than its arguments and overlays.

import type { Case } from "./differences.ts";

/** The cases that run a command and need no more than its arguments and overlays: `[name, args, overlays]`. */
const LISTINGS: [string, string[], string[]?][] = [
	["list as text", ["list"]],
	["list sorted by name", ["list", "--sort", "name", "--json"]],
	["list of specs", ["list", "--specs", "--json"], ["merge"]],
	["list of specs as text", ["list", "--specs"], ["merge"]],
	["list of archived changes", ["list", "--archived", "--json"]],
	["list of all changes", ["list", "--all", "--json"]],
	[
		"validate of each change and spec",
		["validate", "--all", "--json"],
		["merge"],
	],
	["validate of each change", ["validate", "--changes", "--json"]],
	["validate of each spec", ["validate", "--specs", "--json"], ["merge"]],
	["validate of each spec as text", ["validate", "--specs"], ["merge"]],
	[
		"validate of specs with a short purpose and no scenario",
		["validate", "--specs", "--strict", "--json"],
		["short-purpose"],
	],
	["validate of a spec", ["validate", "base", "--json"], ["merge"]],
	["validate of a change as text", ["validate", "add-greeting-name"]],
	["show of a change", ["show", "merge-all", "--json"], ["merge"]],
	[
		"show of the deltas of a change",
		["show", "merge-all", "--json", "--deltas-only"],
		["merge"],
	],
	["show of a change as text", ["show", "merge-all"], ["merge"]],
	["show of the diffs of a change", ["show", "merge-all", "--diff"], ["merge"]],
	["show of a spec", ["show", "base", "--json"], ["merge"]],
	[
		"show of one requirement of a spec",
		["show", "base", "--json", "-r", "2"],
		["merge"],
	],
	["show of a spec as text", ["show", "base"], ["merge"]],
	[
		"instructions apply",
		["instructions", "apply", "--change", "add-greeting-name", "--json"],
	],
	[
		"instructions apply of a change that waits for an artifact",
		["instructions", "apply", "--change", "merge-all", "--json"],
		["merge"],
	],
	[
		"instructions of the proposal",
		["instructions", "proposal", "--change", "merge-all", "--json"],
		["merge", "templates"],
	],
	[
		"instructions of the tasks",
		["instructions", "tasks", "--change", "merge-all", "--json"],
		["merge", "templates"],
	],
	[
		"archive with --json",
		["archive", "merge-all", "--yes", "--json"],
		["merge"],
	],
	[
		"archive with --skip-specs",
		["archive", "merge-all", "--yes", "--skip-specs"],
		["merge"],
	],
	[
		"archive with --no-validate",
		["archive", "bad-scenario", "--yes", "--no-validate"],
	],
	[
		"new change with a description",
		[
			"new",
			"change",
			"add-thing",
			"--schema",
			"story",
			"--description",
			"Hello there",
		],
	],
	[
		"new change with --json",
		["new", "change", "add-thing", "--schema", "story", "--json"],
	],
	[
		"validate of each archived change",
		["validate", "--archived", "--json"],
		["archived"],
	],
	["validate of no archived change as text", ["validate", "--archived"]],
	[
		"show of a spec without scenarios",
		["show", "base", "--json", "--no-scenarios"],
		["merge"],
	],
	[
		"new change with a goal",
		["new", "change", "add-thing", "--schema", "story", "--goal", "G-1"],
	],
	["schemas", ["schemas", "--json"]],
	[
		"schema validate of a schema with its templates",
		["schema", "validate", "story", "--json"],
		["templates"],
	],
	[
		"schema validate of each schema",
		["schema", "validate", "--json"],
		["templates"],
	],
];

export const LISTED: Case[] = LISTINGS.map(
	([name, args, overlays]): Case => ({
		name,
		args,
		...(overlays && { overlays }),
	}),
);
