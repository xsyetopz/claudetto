// The cases of the parity test, with the differences from OpenSpec that design D10 names.

import { expect } from "bun:test";
import { field, list, type Obj, obj, type Run } from "./record.ts";

/** The differences from OpenSpec that design D10 names ("Differences from OpenSpec"), with the reason of each. */
export const DIFFERENCES = {
	"empty-project":
		"`new change` works in a project with no `openspec/` folder, with no copied schema, and writes no `config.yaml`",
	"task-lines":
		"A task is a line that starts with `- [ ]` or `- [x]`, as in `countTasks` (OpenSpec has no issue for it, #1761 is related)",
	messages:
		"The text of an error differs, and the exit code is the same (OpenSpec has no issue for it)",
	"no-tip":
		"The message for a change with no delta leaves out the tip about `openspec change show` (OpenSpec has no issue for it)",
	"done-needs-content":
		"`status` gives `done` for an artifact only when each `##` section of its template has text (OpenSpec issue #1084), so a `proposal.md` without `Capabilities` and `Impact` is `ready`",
	"step-warning":
		"`validate` gives a WARNING for a scenario with no `WHEN` or `GIVEN` step, or no `THEN` step (OpenSpec issue #2078, PR #2079)",
	"overlap-warning":
		"`validate` gives a WARNING when another open change has a `MODIFIED`, `REMOVED`, or `RENAMED` entry for the same requirement (OpenSpec issue #1669)",
	"task-number-warning":
		"`validate` gives a WARNING for a duplicate task number or a task number out of order in `tasks.md` (OpenSpec issue #311)",
	"scenario-rename":
		"A `MODIFIED` block declares a scenario rename with `RENAMED SCENARIO FROM` and `TO`, so the old scenario is not dropped (OpenSpec issue #1697, PR #1843)",
	"open-tasks-json":
		"`archive --yes --json` puts `openTasks` in the JSON when `tasks.md` has an open task (OpenSpec issue #2006)",
	"unknown-flag":
		"An unknown flag exits `2` with the usage, and OpenSpec exits `1` with the error of its parser (OpenSpec has no issue for it)",
	"refusal-error":
		"`validate` gives an ERROR, not an INFO, when the archive would refuse the delta (OpenSpec issue #1112), so the item is not valid and the exit code is `1`",
	"fence-info-string":
		"A fence follows the rules of CommonMark: a backtick fence with a backtick in its info string opens no fence, and a line with 4 spaces and a fence run opens none at the top level, so the requirement after it stays visible (OpenSpec issue #2130)",
	"closing-hashes":
		"A closing run of `#` on a section title, such as `## ADDED Requirements ##`, is no part of the title, so the section counts (OpenSpec issue #2145)",
	"dup-main-requirement":
		"`validate` gives the ERROR `Duplicate requirement in specification` with the path `requirements[<index>]` for a main spec with a repeated requirement, and OpenSpec gives another text with the path `file` and a line (OpenSpec issue #2132)",
	"yaml-parse-error":
		"A broken `openspec/config.yaml` fails with `Cannot parse <file>` and exit `1`, and OpenSpec warns and goes on with exit `0` (OpenSpec issue #1892)",
} as const;

export type Difference = keyof typeof DIFFERENCES;

export interface Case {
	name: string;
	args: string[];
	empty?: boolean;
	overlays?: string[];
	/** `false` when only the exit code and the files are compared, because the error texts differ. */
	text?: boolean;
	differences?: Difference[];
	/** The record that `minispec` gives, from the projection of the OpenSpec record, when the case has a difference. */
	expected?: (openspecProjection: Run) => Run;
}

/** The items of the validation facts of `os`, as objects. */
const itemsOf = (os: Run): Obj[] =>
	list(field(os.facts, "items")).map((i) => obj(i));

/** The record of `minispec` when the archive would refuse a delta: the INFO of OpenSpec is an ERROR, and the item fails. */
const refused = (os: Run): Run => ({
	...os,
	code: 1,
	facts: {
		items: itemsOf(os).map((i) => ({
			...i,
			valid: false,
			issues: list(field(i, "issues")).map((x) => ({
				...obj(x),
				level: "ERROR",
			})),
		})),
		totals: { items: 1, passed: 0, failed: 1 },
	},
});

/** The record of `minispec` for a change that is valid with no issue, from the record of OpenSpec that has errors. */
const clean = (os: Run): Run => ({
	...os,
	code: 0,
	facts: {
		items: itemsOf(os).map((i) => ({
			...i,
			valid: true,
			issues: [],
		})),
		totals: { items: 1, passed: 1, failed: 0 },
	},
});

/** The record `os` with each issue of each item changed by `change`. */
const mapIssues = (os: Run, change: (issue: unknown) => unknown): Run => ({
	...os,
	facts: {
		...obj(os.facts),
		items: itemsOf(os).map((i) => ({
			...i,
			issues: list(field(i, "issues")).map((x) => change(x)),
		})),
	},
});

/** The record of `minispec` for a main spec with a repeated requirement: the ERROR has the path `requirements[1]` and no line. */
const duplicated = (os: Run): Run =>
	mapIssues(os, () => ({
		level: "ERROR",
		path: "requirements[1]",
		message: 'Duplicate requirement in specification: "Foo"',
	}));

/** The record of `minispec` for a valid change that has the one WARNING with `path` and the word `word` in its message, from the record of OpenSpec that has none. */
const warned =
	(path: string, word: string) =>
	(os: Run): Run => ({
		...os,
		facts: {
			...obj(os.facts),
			items: itemsOf(os).map((i) => ({
				...i,
				issues: [
					{
						level: "WARNING",
						path,
						message: expect.stringContaining(word),
					},
				],
			})),
		},
	});

/** The tip that OpenSpec adds to an issue message. */
const TIP = / Tip: .*$/;

/** The artifacts of OpenSpec with the `proposal` that lacks sections as `ready`, and the `design` that needs it as `blocked`. */
const unfinished = (artifacts: unknown[]) =>
	artifacts.map((item) => {
		const a = obj(item);
		if (field(a, "id") === "proposal") {
			return { ...a, status: "ready" };
		}
		if (field(a, "id") === "design") {
			return { ...a, status: "blocked", missingDeps: ["proposal"] };
		}
		return a;
	});

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
	...LISTINGS.map(
		([name, args, overlays]): Case => ({
			name,
			args,
			...(overlays && { overlays }),
		}),
	),
];
