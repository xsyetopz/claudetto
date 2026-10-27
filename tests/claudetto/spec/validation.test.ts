// The scenarios of `minispec` (change `0-3-0`, task 8.2) that the parity test does not cover: the config, the validation rules, the renames, and the status of a proposal.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, YAML as bunYAML, write } from "bun";
import { eachInOrder } from "../../../tools/ordered.ts";
import { minispec, tmpEmpty } from "../../support/openspec.ts";
import { REPO } from "../../support/repo.ts";
import { filesOf, newChange, withDelta } from "./workspace.ts";

test("a broken `config.yaml` fails with the file and the parse message, and no stack trace", async () => {
	const root = await tmpEmpty("minispec-bad-yaml");
	await write(
		path.join(root, "openspec/config.yaml"),
		'rules:\n  proposal:\n    - "unterminated\n',
	);
	const run = await minispec(root, ["new", "change", "zz"]);
	expect(run.code).toBe(1);
	expect(run.out).toContain("openspec/config.yaml");
	expect(run.out).toContain("Cannot parse");
	expect(run.out).not.toContain("    at ");
});

test("a missing `config.yaml` is no failure", async () => {
	const root = await tmpEmpty("minispec-no-config");
	const run = await minispec(root, ["new", "change", "zz"]);
	expect(run.code).toBe(0);
});

test("a flag that takes a value reads the next argument as its value, also when it starts with a dash", async () => {
	const root = await tmpEmpty("minispec-dash-value");
	const run = await minispec(root, [
		"new",
		"change",
		"z",
		"--description",
		"--schema",
		"--goal=y",
	]);
	expect(run.code).toBe(0);
	const dir = path.join(root, "openspec/changes/z");
	expect(await bunFile(path.join(dir, "README.md")).text()).toContain(
		"--schema",
	);
	expect(await bunFile(path.join(dir, ".openspec.yaml")).text()).toContain(
		'goal: "y"',
	);
});

/** The main spec `base` with the requirement `Real` and one scenario. */
const BASE = `## Purpose

The capability base does a thing for the tests of MiniSpec.

## Requirements

### Requirement: Real

The system SHALL do Real.

#### Scenario: Real Happens

- **WHEN** a condition holds
- **THEN** Real follows
`;

/** A delta for `base` with the section `kind` and the requirement `name`, and the scenario `scenario` with the steps `steps`. */
const baseDelta = (
	kind: string,
	name = "Real",
	scenario = "Real Happens",
	steps = "- **WHEN** a condition holds\n- **THEN** Real follows",
): string =>
	`## ${kind} Requirements\n\n### Requirement: ${name}\n\nThe system SHALL do ${name}.\n\n#### Scenario: ${scenario}\n\n${steps}\n`;

/** A project with the main spec `base`, and the open changes `changes`, each with the delta of `base` that it names. */
const withBase = async (changes: Record<string, string>): Promise<string> => {
	const root = await tmpEmpty("minispec-base");
	await write(path.join(root, "openspec/specs/base/spec.md"), BASE);
	await eachInOrder(Object.entries(changes), async ([name, delta]) => {
		await newChange(root, name);
		await write(
			path.join(root, `openspec/changes/${name}/specs/base/spec.md`),
			delta,
		);
	});
	return root;
};

test("Archive Would Refuse: `validate` gives an ERROR for a `MODIFIED` of a missing requirement (OpenSpec issue #1112)", async () => {
	const root = await withBase({ c: baseDelta("MODIFIED", "Goodbye") });
	const run = await minispec(root, ["validate", "c", "--strict", "--json"]);
	expect(run.code).toBe(1);
	const [issue] = JSON.parse(run.out).items[0].issues;
	expect(issue.level).toBe("ERROR");
	expect(issue.message).toContain("Archive would refuse this delta");
});

test("Only an AND Step: `validate --strict` fails a scenario with no `WHEN`, `GIVEN`, or `THEN` step (OpenSpec issue #2078)", async () => {
	const root = await withBase({
		c: baseDelta(
			"ADDED",
			"Extra",
			"Only an AND Step",
			"- **AND** the ledger is balanced",
		),
	});
	const run = await minispec(root, ["validate", "c", "--strict", "--json"]);
	expect(run.code).toBe(1);
	const issues = JSON.parse(run.out).items[0].issues;
	expect(issues).toHaveLength(1);
	expect(issues[0].level).toBe("WARNING");
	expect(issues[0].message).toContain("Only an AND Step");
	const plain = await minispec(root, ["validate", "c"]);
	expect(plain.code).toBe(0);
});

test("a scenario with a `GIVEN` step and a `THEN` step gets no step warning", async () => {
	const root = await withBase({
		c: baseDelta(
			"ADDED",
			"Extra",
			"Given Then",
			"- **GIVEN** a state\n- **THEN** a result",
		),
	});
	const run = await minispec(root, ["validate", "c", "--strict"]);
	expect(run.code).toBe(0);
});

test("Two Changes Modify One Requirement: `validate --strict` warns and names the other change (OpenSpec issue #1669)", async () => {
	const root = await withBase({
		o1: baseDelta("MODIFIED"),
		o2: baseDelta("MODIFIED"),
	});
	const run = await minispec(root, ["validate", "o2", "--strict", "--json"]);
	expect(run.code).toBe(1);
	const [issue, ...rest] = JSON.parse(run.out).items[0].issues;
	expect(rest).toEqual([]);
	expect(issue.level).toBe("WARNING");
	expect(issue.message).toContain("o1");
	expect(issue.message).toContain("Real");
	expect((await minispec(root, ["validate", "o2"])).code).toBe(0);
});

test("a change that only adds a requirement raises no overlap warning", async () => {
	const root = await withBase({
		o1: baseDelta("MODIFIED"),
		o2: baseDelta("ADDED", "Other"),
	});
	const run = await minispec(root, ["validate", "o2", "--strict"]);
	expect(run.code).toBe(0);
});

/** The `validate --strict --json` issues of the change `c` that has the delta and the `tasks.md` text `tasks`. */
const taskIssues = async (tasks: string) => {
	const root = await withBase({ c: baseDelta("ADDED", "Extra") });
	await write(path.join(root, "openspec/changes/c/tasks.md"), tasks);
	const run = await minispec(root, ["validate", "c", "--strict", "--json"]);
	return { code: run.code, issues: JSON.parse(run.out).items[0].issues };
};

test("Duplicate Number: `validate --strict` warns about a task number that appears twice (OpenSpec issue #311)", async () => {
	const { code, issues } = await taskIssues(
		"## 1. A\n\n- [ ] 1.1 a\n- [ ] 1.2 a\n- [ ] 1.2 b\n",
	);
	expect(code).toBe(1);
	expect(issues).toHaveLength(1);
	expect(issues[0].level).toBe("WARNING");
	expect(issues[0].message).toContain("1.2");
});

test("`validate --strict` warns about a task number that is lower than the one before it", async () => {
	const { code, issues } = await taskIssues("- [ ] 1.3 a\n- [ ] 1.2 b\n");
	expect(code).toBe(1);
	expect(issues[0].message).toContain("1.2");
});

test("numbers in order, with a jump to the next group, raise no task warning", async () => {
	const { code } = await taskIssues(
		"- [ ] 1.1 a\n- [x] 1.2 b\n- [ ] 1.10 c\n- [ ] 2.1 d\n",
	);
	expect(code).toBe(0);
});

test("One Open Task: `archive --yes --json` puts the open task count in the JSON (OpenSpec issue #2006)", async () => {
	const root = await withDelta();
	await write(
		path.join(root, "openspec/changes/c/tasks.md"),
		"## 1. A\n\n- [x] 1.1 done\n- [ ] 1.2 undone\n",
	);
	const run = await minispec(root, ["archive", "c", "--yes", "--json"]);
	expect(run.code).toBe(0);
	expect(JSON.parse(run.out).archive.openTasks).toBe(1);
});

test("`archive --yes --json` of a change with no open task has no open task count", async () => {
	const root = await withDelta();
	await write(
		path.join(root, "openspec/changes/c/tasks.md"),
		"- [x] 1.1 done\n",
	);
	const run = await minispec(root, ["archive", "c", "--yes", "--json"]);
	expect(JSON.parse(run.out).archive).not.toHaveProperty("openTasks");
});

/** A `MODIFIED` delta of `Real` that renames `Real Happens` as `Real Renamed`, with the declaration `declared` and the scenario `kept`. */
const renameDelta = (declared: string, kept = "Real Renamed"): string =>
	`## MODIFIED Requirements\n\n### Requirement: Real\n\nThe system SHALL do Real.\n\n${declared}\n\n#### Scenario: ${kept}\n\n- **WHEN** a condition holds\n- **THEN** Real follows\n`;
const RENAME =
	"- RENAMED SCENARIO FROM: `#### Scenario: Real Happens`\n- RENAMED SCENARIO TO: `#### Scenario: Real Renamed`";

test("Renamed Scenario: a declared rename passes `validate`, and `archive` writes the new name and no declaration (OpenSpec issue #1697)", async () => {
	const root = await withBase({ c: renameDelta(RENAME) });
	const valid = await minispec(root, ["validate", "c", "--strict"]);
	expect(valid.code).toBe(0);
	const run = await minispec(root, ["archive", "c", "--yes"]);
	expect(run.code).toBe(0);
	const main = await bunFile(
		path.join(root, "openspec/specs/base/spec.md"),
	).text();
	expect(main).toContain("#### Scenario: Real Renamed");
	expect(main).not.toContain("Real Happens");
	expect(main).not.toContain("RENAMED SCENARIO");
});

test("a rename that nobody declares still counts the old scenario as dropped", async () => {
	const root = await withBase({ c: renameDelta("") });
	const run = await minispec(root, ["validate", "c", "--strict"]);
	expect(run.code).toBe(1);
});

test("a declared rename whose new scenario is not in the block gives no credit", async () => {
	const root = await withBase({ c: renameDelta(RENAME, "Other Name") });
	const run = await minispec(root, ["validate", "c", "--strict"]);
	expect(run.code).toBe(1);
});

test("a declaration with one half gives no credit", async () => {
	const root = await withBase({
		c: renameDelta(RENAME.split("\n")[0] ?? ""),
	});
	const run = await minispec(root, ["validate", "c", "--strict"]);
	expect(run.code).toBe(1);
});

/** The status of the artifact `id` of a new change `a` of the preset `story` whose `proposal.md` holds `proposal`. */
const proposalStatus = async (proposal: string, id = "proposal") => {
	const root = await tmpEmpty("minispec-done");
	await minispec(root, ["new", "change", "a", "--schema", "story"]);
	await write(path.join(root, "openspec/changes/a/proposal.md"), proposal);
	const status = JSON.parse(
		(await minispec(root, ["status", "--change", "a", "--json"])).out,
	);
	return status.artifacts.find((a: { id: string }) => a.id === id).status;
};

test("Half-Written Proposal: `status` does not give `done` for a `proposal.md` with a heading and no text (OpenSpec issue #1084)", async () => {
	expect(await proposalStatus("## Why\n")).not.toBe("done");
});

test("`status` does not give `done` when a section of the template is missing or has no text", async () => {
	const text =
		"## Why\n\nBecause.\n\n## What Changes\n\n- A\n\n## Capabilities\n\n## Impact\n\nNone.\n";
	expect(await proposalStatus(text)).not.toBe("done");
	expect(
		await proposalStatus(text.replace("## Capabilities\n\n", "")),
	).not.toBe("done");
});

test("`status` gives `done` when each section of the template has text, also in a subsection", async () => {
	const text =
		"## Why\n\nBecause.\n\n## What Changes\n\n- A\n\n## Capabilities\n\n### New Capabilities\n\n- `x`\n\n## Impact\n\nNone.\n";
	expect(await proposalStatus(text)).toBe("done");
});

test("OpenSpec Project: the schema `spec-driven` of `config.yaml` works as the preset `story`", async () => {
	const root = await tmpEmpty("minispec-spec-driven");
	await write(path.join(root, "openspec/config.yaml"), "schema: spec-driven\n");
	const made = await minispec(root, ["new", "change", "x"]);
	const status = await minispec(root, ["status", "--change", "x", "--json"]);
	const steps = await minispec(root, [
		"instructions",
		"proposal",
		"--change",
		"x",
		"--json",
	]);
	expect([made.code, status.code, steps.code]).toEqual([0, 0, 0]);
	expect(JSON.parse(status.out).artifacts[0].id).toBe("proposal");
	expect(
		await bunFile(path.join(root, "openspec/changes/x/.openspec.yaml")).text(),
	).toStartWith("schema: spec-driven\n");
});

test("Unknown Flag: a flag that the command lacks exits `2` and names the flag, and no file is written", async () => {
	const root = await withBase({ c: baseDelta("ADDED", "Extra") });
	const before = await filesOf(root);
	const run = await minispec(root, ["validate", "c", "--type", "change"]);
	expect(run.code).toBe(2);
	expect(run.out).toContain("--type");
	const made = await minispec(root, ["new", "change", "n", "--store", "s"]);
	expect(made.code).toBe(2);
	expect(await filesOf(root)).toEqual(before);
});

test("a value of a flag is no unknown flag, and `--no-interactive` is accepted", async () => {
	const root = await withBase({ c: baseDelta("ADDED", "Extra") });
	const list = await minispec(root, ["list", "--sort", "name", "--json"]);
	const valid = await minispec(root, ["validate", "c", "--no-interactive"]);
	expect([list.code, valid.code]).toEqual([0, 0]);
});

test.each([["-h"], ["--help"], ["help"]])(
	"Help: `minispec %s` prints the usage and exits 0",
	async (flag) => {
		const run = await minispec(await tmpEmpty("minispec-help"), [flag]);
		expect(run.code).toBe(0);
		expect(run.out).toContain("minispec new change");
		expect(run.out).toContain("minispec archive");
	},
);

test("`--help` after a command prints the usage of that command only", async () => {
	const run = await minispec(await tmpEmpty("minispec-help-one"), [
		"validate",
		"--help",
	]);
	expect(run.code).toBe(0);
	expect(run.out).toContain("minispec validate");
	expect(run.out).not.toContain("minispec archive");
});

test("`--version` prints the version of the plugin and exits 0", async () => {
	const version = (
		await bunFile(
			path.join(REPO, "plugins/claudetto/.claude-plugin/plugin.json"),
		).json()
	).version;
	const run = await minispec(await tmpEmpty("minispec-version-flag"), [
		"--version",
	]);
	expect(run.code).toBe(0);
	expect(run.out.trim()).toBe(version);
});

test("`new change --goal` keeps a goal with YAML characters as one string", async () => {
	const root = await tmpEmpty("minispec-goal");
	const goal = "Ship it: now # soon";
	const run = await minispec(root, ["new", "change", "g", "--goal", goal]);
	const meta = bunYAML.parse(
		await bunFile(path.join(root, "openspec/changes/g/.openspec.yaml")).text(),
	);
	expect(run.code).toBe(0);
	expect(meta).toMatchObject({ goal });
});

test("`new change` ends with a `Next:` line that names the skill `propose`", async () => {
	const root = await tmpEmpty("minispec-next-line");
	const run = await minispec(root, ["new", "change", "a"]);
	expect(run.code).toBe(0);
	expect(run.out.trimEnd().split("\n").at(-1)).toBe("Next: /claudetto:propose");
});

test("`-h` as the value of a flag is no help flag", async () => {
	const root = await tmpEmpty("minispec-help-value");
	const run = await minispec(root, ["new", "change", "z", "--goal", "-h"]);
	expect(run.code).toBe(0);
	expect(run.out).not.toContain("Usage:");
	expect(await filesOf(root)).toEqual(["openspec/changes/z/.openspec.yaml"]);
});

test("a `THEN` step inside a code fence does not count as the step of a scenario", async () => {
	const root = await withBase({
		c: baseDelta(
			"ADDED",
			"Extra",
			"Fenced Then",
			"- **WHEN** a\n\n```\n- **THEN** fenced\n```",
		),
	});
	const run = await minispec(root, ["validate", "c", "--strict", "--json"]);
	const issues = JSON.parse(run.out).items[0].issues;
	expect(issues).toHaveLength(1);
	expect(issues[0].message).toContain("Fenced Then");
});

test("a task line inside a code fence raises no task number warning", async () => {
	const { code } = await taskIssues(
		"- [ ] 1.2 a\n\n```\n- [ ] 1.1 in fence\n- [ ] 1.2 in fence\n```\n",
	);
	expect(code).toBe(0);
});

test("`status` does not give `done` for a section that holds only an HTML comment", async () => {
	const text =
		"## Why\n\nBecause.\n\n## What Changes\n\n- A\n\n## Capabilities\n\n<!-- later -->\n\n## Impact\n\nNone.\n";
	expect(await proposalStatus(text)).not.toBe("done");
});

test("`status` does not give `done` for a section with a multi-line HTML comment that holds a `##` line", async () => {
	const text =
		"## Why\n\nBecause.\n\n## What Changes\n\n- A\n\n## Capabilities\n\n<!--\n## Other\n-->\n\n## Impact\n\nNone.\n";
	expect(await proposalStatus(text)).not.toBe("done");
});

test("`--sort=name` works as `--sort name`, as in OpenSpec", async () => {
	const root = await withBase({});
	const joined = await minispec(root, ["list", "--specs", "--sort=name"]);
	const apart = await minispec(root, ["list", "--specs", "--sort", "name"]);
	expect(joined.code).toBe(0);
	expect(joined.out).toBe(apart.out);
});
