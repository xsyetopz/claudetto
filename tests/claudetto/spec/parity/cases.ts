// The cases of the parity test, with the differences from OpenSpec that design D10 names.

import type { Case } from "./differences.ts";
import {
	clean,
	duplicated,
	mapIssues,
	refused,
	TIP,
	unfinished,
	warned,
} from "./expected.ts";
import { LISTED } from "./listings.ts";
import { field, list, obj } from "./shared.ts";

export const CASES: Case[] = [
	{
		name: "new change in a project with no openspec folder",
		args: ["new", "change", "add-thing", "--schema", "story"],
		empty: true,
		differences: ["empty-project"],
		expected: () => ({
			code: 0,
			facts: [
				"Created change 'add-thing' at openspec/changes/add-thing/",
				"Schema: story",
			],
			written: {
				"openspec/changes/add-thing/.openspec.yaml":
					"schema: story\ncreated: <date>\n",
			},
			removed: [],
		}),
	},
	{
		name: "new change",
		args: ["new", "change", "add-thing", "--schema", "story"],
	},
	{
		name: "new change with the task preset",
		args: ["new", "change", "fix-thing", "--schema", "task"],
	},
	{
		name: "new change with a bad name",
		args: ["new", "change", "Add_Thing", "--schema", "story"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "new change that exists",
		args: ["new", "change", "add-greeting-name", "--schema", "story"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "new change with an unknown schema",
		args: ["new", "change", "add-thing", "--schema", "nope"],
		text: false,
		differences: ["messages"],
	},
	{ name: "list", args: ["list", "--json"] },
	{
		name: "list with tasks that the line rule reads differently",
		args: ["list", "--json"],
		overlays: ["odd-tasks"],
		differences: ["task-lines"],
		expected: (os) => ({
			...os,
			facts: list(os.facts).map((c) =>
				field(c, "name") === "odd-tasks"
					? {
							...obj(c),
							completedTasks: 0,
							totalTasks: 1,
							status: "in-progress",
						}
					: c,
			),
		}),
	},
	{
		name: "status of the task sample",
		args: ["status", "--change", "fix-greeting-typo", "--json"],
	},
	{
		name: "status of the story sample",
		args: ["status", "--change", "add-greeting-name", "--json"],
	},
	{
		name: "status of the epic sample",
		args: ["status", "--change", "build-greeter", "--json"],
	},
	{
		name: "status of a change with a missing artifact",
		args: ["status", "--change", "bad-scenario", "--json"],
		differences: ["done-needs-content"],
		expected: (os) => ({
			...os,
			facts: {
				...obj(os.facts),
				artifacts: unfinished(list(field(os.facts, "artifacts"))),
			},
		}),
	},
	{
		name: "status of an unknown change",
		args: ["status", "--change", "nope", "--json"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "validate of the story sample",
		args: ["validate", "add-greeting-name", "--json"],
	},
	{
		name: "validate of the task sample",
		args: ["validate", "fix-greeting-typo", "--json"],
	},
	{
		name: "validate of the epic sample with --strict",
		args: ["validate", "build-greeter", "--strict", "--json"],
	},
	{
		name: "validate of a requirement with no scenario",
		args: ["validate", "bad-scenario", "--json"],
	},
	{
		name: "validate of a requirement with no SHALL",
		args: ["validate", "no-shall", "--json"],
		overlays: ["no-shall"],
	},
	{
		name: "validate of a requirement with no SHALL with --strict",
		args: ["validate", "no-shall", "--strict", "--json"],
		overlays: ["no-shall"],
	},
	{
		name: "validate of a change with no delta",
		args: ["validate", "odd-tasks", "--json"],
		overlays: ["odd-tasks"],
		differences: ["no-tip"],
		expected: (os) =>
			mapIssues(os, (x) => ({
				...obj(x),
				message: String(field(x, "message")).replace(TIP, ""),
			})),
	},
	{
		name: "validate of the merge change",
		args: ["validate", "merge-all", "--json"],
		overlays: ["merge"],
	},
	{
		name: "validate of an unknown change",
		args: ["validate", "nope", "--json"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "status of each change",
		args: ["status", "--all", "--json"],
		differences: ["done-needs-content"],
		expected: (os) => ({
			...os,
			facts: list(os.facts).map((c) =>
				field(c, "changeName") === "bad-scenario"
					? { ...obj(c), artifacts: unfinished(list(field(c, "artifacts"))) }
					: c,
			),
		}),
	},
	{
		name: "archive of the story sample",
		args: ["archive", "add-greeting-name", "--yes"],
	},
	{
		name: "archive of a change with each kind of delta",
		args: ["archive", "merge-all", "--yes"],
		overlays: ["merge"],
	},
	{
		name: "archive of a change that does not validate",
		args: ["archive", "bad-scenario", "--yes"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "archive of a change that modifies a missing spec",
		args: ["archive", "missing-target", "--yes"],
		overlays: ["missing-target"],
		text: false,
		differences: ["messages"],
	},
	{
		name: "archive of an unknown change",
		args: ["archive", "nope", "--yes"],
		text: false,
		differences: ["messages"],
	},
	...["dup-added", "h3-scenario", "long-requirement", "mod-drops-scenario"].map(
		(name): Case => ({
			name: `validate of ${name}`,
			args: ["validate", name, "--strict", "--json"],
			overlays: [name],
		}),
	),
	{
		name: "validate of a scenario with only an AND step",
		args: ["validate", "and-step", "--json"],
		overlays: ["and-step"],
		differences: ["step-warning"],
		expected: warned("base/spec.md", "Only an AND Step"),
	},
	{
		name: "validate of a change that another open change also modifies",
		args: ["validate", "o2", "--json"],
		overlays: ["overlap"],
		differences: ["overlap-warning"],
		expected: warned("base/spec.md", "o1"),
	},
	{
		name: "validate of a change with a duplicate task number",
		args: ["validate", "dup-tasks", "--json"],
		overlays: ["dup-tasks"],
		differences: ["task-number-warning"],
		expected: warned("tasks.md", "1.2"),
	},
	{
		name: "validate of a change with a renamed scenario",
		args: ["validate", "renamed-scenario", "--json"],
		overlays: ["renamed-scenario"],
		differences: ["scenario-rename"],
		expected: clean,
	},
	...(
		[
			["fence-info", "fence-info-string"],
			["closing-hashes", "closing-hashes"],
		] as const
	).map(
		([name, difference]): Case => ({
			name: `validate of ${name}`,
			args: ["validate", name, "--json"],
			overlays: [name],
			differences: [difference],
			expected: clean,
		}),
	),
	{
		name: "validate of a main spec with a duplicate requirement",
		args: ["validate", "dup", "--specs", "--json"],
		overlays: ["dup-main"],
		differences: ["dup-main-requirement"],
		expected: duplicated,
	},
	{
		name: "status with a broken config.yaml",
		args: ["status", "--change", "add-greeting-name", "--json"],
		overlays: ["bad-yaml"],
		text: false,
		differences: ["yaml-parse-error"],
		expected: (os) => ({ ...os, code: 1, facts: null }),
	},
	{
		name: "archive --json of a change with an open task",
		args: ["archive", "open-task", "--yes", "--json"],
		overlays: ["open-task"],
		differences: ["open-tasks-json"],
		expected: (os) => ({
			...os,
			facts: { ...obj(os.facts), openTasks: 1 },
		}),
	},
	{
		name: "validate with an unknown flag",
		args: ["validate", "add-greeting-name", "--nope"],
		text: false,
		differences: ["messages", "unknown-flag"],
		expected: (os) => ({ ...os, code: 2 }),
	},
	...["mod-missing", "add-exists"].map(
		(name): Case => ({
			name: `validate of ${name}`,
			args: ["validate", name, "--strict", "--json"],
			overlays: [name],
			differences: ["refusal-error"],
			expected: refused,
		}),
	),
	{
		name: "archive of a change that removes a missing requirement",
		args: ["archive", "rem-missing", "--yes"],
		overlays: ["rem-missing"],
	},
	...LISTED,
];
