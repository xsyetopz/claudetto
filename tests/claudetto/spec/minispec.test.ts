// The scenarios of the capability `minispec` (change `0-3-0`, task 8.2) that the parity test does not cover.

import { expect, test } from "bun:test";
import { access, cp, readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, YAML as bunYAML, spawn, write } from "bun";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../tools/limits.ts";
import { eachInOrder } from "../../../tools/ordered.ts";
import {
	minispec,
	openspec,
	PRESETS,
	sampleProject,
	tmpEmpty,
} from "../../support/openspec.ts";
import { REPO, walk } from "../../support/repo.ts";

const SCENARIO_ONWARD = /#### Scenario[\s\S]*$/;
const ARCHIVED_NAME = /^\d{4}-\d{2}-\d{2}-c$/;
const ONE = /\b1\b/;
const MINISPEC_FENCE = /^`{3}minispec.*$/m;
const SHALL_DO = /SHALL do (\w+)/;
const RAW_ARGS = /\bargs\b/;

const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

/** Runs `minispec new change name` on `root`, and throws when it exits not 0. */
const newChange = async (root: string, name: string): Promise<void> => {
	const run = await minispec(root, ["new", "change", name]);
	if (run.code !== 0) {
		throw new Error(`\`new change ${name}\` exited ${run.code}: ${run.out}`);
	}
};

const DELTA = `## Purpose

The capability x does a thing for the tests of MiniSpec.

## ADDED Requirements

### Requirement: A

The system SHALL do A.

#### Scenario: A Happens

- **WHEN** a condition holds
- **THEN** A follows
`;

/** A fresh project with the change `c` of the preset `story` and the delta `specs/x/spec.md`. */
const withDelta = async (delta = DELTA): Promise<string> => {
	const root = await tmpEmpty("minispec");
	await newChange(root, "c");
	await write(path.join(root, "openspec/changes/c/specs/x/spec.md"), delta);
	return root;
};

/** Runs the `args` on a project with a delta, and gives the code and the text of `openspec/specs/x/spec.md`. */
const mergesDelta = async (root: string, args: string[]) => {
	const run = await minispec(root, args);
	const spec = await bunFile(
		path.join(root, "openspec/specs/x/spec.md"),
	).text();
	return { code: run.code, spec };
};

const filesOf = async (root: string): Promise<string[]> =>
	(await walk(root)).map((f) => path.relative(root, f));

test("a fresh project gets only the change folder, and no OpenSpec install", async () => {
	const root = await tmpEmpty("minispec-fresh");
	const run = await minispec(root, ["new", "change", "add-thing"]);
	expect(run.code).toBe(0);
	expect(await filesOf(root)).toEqual([
		"openspec/changes/add-thing/.openspec.yaml",
	]);
	expect(await exists(path.join(root, ".claude"))).toBe(false);
});

test("Version Name", async () => {
	const root = await tmpEmpty("minispec-version");
	const run = await minispec(root, ["new", "change", "release-2.1.309"]);
	expect(run.code).toBe(0);
	expect(run.out).toContain("release-2-1-309");
	expect(
		await exists(path.join(root, "openspec/changes/release-2-1-309")),
	).toBe(true);
});

test("Bad Name", async () => {
	const root = await tmpEmpty("minispec-bad-name");
	const run = await minispec(root, ["new", "change", "Release_X"]);
	expect(run.code).not.toBe(0);
	expect(run.out).toContain("Release_X");
	expect(await filesOf(root)).toEqual([]);
});

test("New Change", async () => {
	const root = await tmpEmpty("minispec-no-handoff");
	await minispec(root, ["new", "change", "release-x"]);
	expect(
		await exists(path.join(root, "openspec/changes/release-x/handoff.md")),
	).toBe(false);
});

test("`new change` without --schema uses the schema of `config.yaml`, and `story` with no file", async () => {
	const bare = await tmpEmpty("minispec-default");
	await minispec(bare, ["new", "change", "a"]);
	expect(
		await bunFile(path.join(bare, "openspec/changes/a/.openspec.yaml")).text(),
	).toStartWith("schema: story\n");
	const root = await tmpEmpty("minispec-config");
	await write(path.join(root, "openspec/config.yaml"), "schema: task\n");
	await minispec(root, ["new", "change", "a"]);
	expect(
		await bunFile(path.join(root, "openspec/changes/a/.openspec.yaml")).text(),
	).toContain("skip_specs: true");
});

test("a project schema wins over the shipped preset", async () => {
	const root = await tmpEmpty("minispec-schema");
	const dir = path.join(root, "openspec/schemas/story");
	await cp(path.join(PRESETS, "story"), dir, { recursive: true });
	await write(
		path.join(dir, "schema.yaml"),
		(await bunFile(path.join(dir, "schema.yaml")).text()).replace(
			"name: story",
			"name: story\nx-marker: 1",
		),
	);
	await write(path.join(dir, "templates/proposal.md"), "MINE\n");
	await minispec(root, ["new", "change", "a", "--schema", "story"]);
	const status = JSON.parse(
		(await minispec(root, ["status", "--change", "a", "--json"])).out,
	);
	expect(status.artifacts[0].template).toBe(
		path.join(dir, "templates/proposal.md"),
	);
});

test("`status --json` gives the template, the instruction, the context, the rules, and the apply block", async () => {
	const root = await sampleProject(["story"]);
	await write(
		path.join(root, "openspec/config.yaml"),
		"schema: story\ncontext: |\n  Stack: Bun\nrules:\n  proposal:\n    - State what is out of scope.\n",
	);
	const status = JSON.parse(
		(
			await minispec(root, [
				"status",
				"--change",
				"add-greeting-name",
				"--json",
			])
		).out,
	);
	const proposal = status.artifacts.find(
		(a: { id: string }) => a.id === "proposal",
	);
	expect(path.isAbsolute(proposal.template)).toBe(true);
	expect(await bunFile(proposal.template).exists()).toBe(true);
	expect(proposal.instruction.length).toBeGreaterThan(0);
	expect(status.context).toBe("Stack: Bun\n");
	expect(status.rules).toEqual({ proposal: ["State what is out of scope."] });
	expect(status.apply.requires).toEqual(["review"]);
	expect(status.apply.instruction.length).toBeGreaterThan(0);
	expect(status.tasks).toEqual({ done: 0, total: 1, next: "1.1" });
});

test("Planning Done", async () => {
	const root = await sampleProject(["story"]);
	await write(
		path.join(root, "openspec/changes/add-greeting-name/tasks.md"),
		"## 1. A\n\n- [x] 1.1 Done\n\n## 2. B\n\n- [ ] 2.1 Open\n",
	);
	const args = ["status", "--change", "add-greeting-name"];
	const text = await minispec(root, args);
	expect(text.out.trimEnd().split("\n").at(-1)).toBe("Next: /claudetto:apply");
	const json = JSON.parse((await minispec(root, [...args, "--json"])).out);
	expect(json.next).toBe("/claudetto:apply");
	expect(json.tasks.next).toBe("2.1");
});

test("`status` names `propose` while an artifact is open, and `archive` when each task is done", async () => {
	const root = await tmpEmpty("minispec-next");
	await minispec(root, ["new", "change", "a", "--schema", "story"]);
	const args = ["status", "--change", "a"];
	expect((await minispec(root, args)).out).toContain(
		"Next: /claudetto:propose",
	);
	const done = await sampleProject(["story"]);
	await write(
		path.join(done, "openspec/changes/add-greeting-name/tasks.md"),
		"- [x] 1.1 Done\n",
	);
	const run = await minispec(done, ["status", "--change", "add-greeting-name"]);
	expect(run.out).toContain("Next: /claudetto:archive");
});

test("JSON Only on Request", async () => {
	const root = await sampleProject(["story"]);
	const run = await minispec(root, ["status", "--change", "add-greeting-name"]);
	expect(run.code).toBe(0);
	expect(run.out).toContain("[x] proposal");
	expect(() => JSON.parse(run.out)).toThrow();
});

test("`status` gives the ready artifacts of a new change", async () => {
	const root = await tmpEmpty("minispec-ready");
	await minispec(root, ["new", "change", "a", "--schema", "story"]);
	const status = JSON.parse(
		(await minispec(root, ["status", "--change", "a", "--json"])).out,
	);
	const by = (id: string) =>
		status.artifacts.find((a: { id: string }) => a.id === id);
	expect(by("proposal").status).toBe("ready");
	expect(by("specs").status).toBe("blocked");
	expect(by("specs").missingDeps).toEqual(["proposal"]);
	expect(status.isComplete).toBe(false);
});

test("`validate` names the requirement that has no scenario, and exits not 0", async () => {
	const root = await withDelta(DELTA.replace(SCENARIO_ONWARD, ""));
	const run = await minispec(root, ["validate", "c", "--json"]);
	expect(run.code).not.toBe(0);
	expect(JSON.parse(run.out).items[0].issues[0].message).toContain('ADDED "A"');
});

test(
	"OpenSpec reads a change that MiniSpec writes",
	async () => {
		const root = await withDelta();
		expect((await minispec(root, ["validate", "c", "--strict"])).code).toBe(0);
		const run = await openspec(root, ["validate", "c", "--strict"]);
		expect(run.code).toBe(0);
	},
	OPENSPEC_RUN_TIMEOUT_MS,
);

test("`archive` merges a delta into `openspec/specs/` and moves the change", async () => {
	const root = await withDelta();
	const merged = await mergesDelta(root, ["archive", "c", "--yes"]);
	expect(merged.code).toBe(0);
	expect(merged.spec).toContain("### Requirement: A");
	expect(await exists(path.join(root, "openspec/changes/c"))).toBe(false);
	const archived = await readdir(path.join(root, "openspec/changes/archive"));
	expect(archived).toHaveLength(1);
	expect(archived[0]).toMatch(ARCHIVED_NAME);
});

test("Sync a Change", async () => {
	const root = await withDelta();
	const merged = await mergesDelta(root, ["sync", "c"]);
	expect(merged.code).toBe(0);
	expect(merged.spec).toContain("### Requirement: A");
	expect(await exists(path.join(root, "openspec/changes/c"))).toBe(true);
	expect(await exists(path.join(root, "openspec/changes/archive"))).toBe(false);
});

test("`sync` of a change whose merge fails writes no spec", async () => {
	const root = await withDelta(DELTA.replace("## ADDED", "## MODIFIED"));
	const run = await minispec(root, ["sync", "c"]);
	expect(run.code).toBe(1);
	expect(await exists(path.join(root, "openspec/specs"))).toBe(false);
});

test("`archive` stops at open tasks until `--yes`", async () => {
	const root = await withDelta();
	await write(
		path.join(root, "openspec/changes/c/tasks.md"),
		"## 1. A\n\n- [ ] 1.1 Open\n",
	);
	const before = await filesOf(root);
	const run = await minispec(root, ["archive", "c"]);
	expect(run.code).toBe(1);
	expect(run.out).toMatch(ONE);
	expect(run.out).toContain("--yes");
	expect(await filesOf(root)).toEqual(before);
});

test("`archive` keeps a change whose merge fails, and writes no spec", async () => {
	const root = await withDelta(DELTA.replace("## ADDED", "## MODIFIED"));
	const run = await minispec(root, ["archive", "c", "--yes"]);
	expect(run.code).toBe(1);
	expect(await exists(path.join(root, "openspec/specs"))).toBe(false);
	expect(await exists(path.join(root, "openspec/changes/c"))).toBe(true);
});

test("`list` of a project with no `openspec/` folder gives an empty list", async () => {
	const run = await minispec(await tmpEmpty("minispec-list"), [
		"list",
		"--json",
	]);
	expect(run.code).toBe(0);
	expect(JSON.parse(run.out).changes).toEqual([]);
});

test("a bad call exits `2` with the usage", async () => {
	const run = await minispec(await tmpEmpty("minispec-usage"), ["nope"]);
	expect(run.code).toBe(2);
	expect(run.out).toContain("new change");
});

test("the launcher `bin/minispec` runs the command", async () => {
	const proc = spawn(
		[path.join(REPO, "plugins/claudetto/bin/minispec"), "list", "--json"],
		{ cwd: await tmpEmpty("minispec-bin"), stdout: "pipe", stderr: "pipe" },
	);
	expect(await proc.exited).toBe(0);
	expect(JSON.parse(await new Response(proc.stdout).text()).changes).toEqual(
		[],
	);
});

const TWO = `## ADDED Requirements

### Requirement: One

\`\`\`minispec validate\`\`\` SHALL exit 0.

#### Scenario: One Happens

- **WHEN** a condition holds
- **THEN** One follows

### Requirement: Two

The system SHALL do Two.

#### Scenario: Two Happens

- **WHEN** a condition holds
- **THEN** Two follows
`;

/** The texts of the added requirements that `show --deltas-only` reads from the delta of the change `c`. */
const addedTexts = async (root: string): Promise<string[]> => {
	const run = await minispec(root, ["show", "c", "--json", "--deltas-only"]);
	if (run.code !== 0) {
		throw new Error(`\`show\` exited ${run.code}: ${run.out}`);
	}
	return JSON.parse(run.out)
		.deltas.filter((d: { operation: string }) => d.operation === "ADDED")
		.map((d: { requirement: { text: string } }) => d.requirement.text);
};

test("a backtick fence with a backtick in its info string opens no fence (OpenSpec issue #2130)", async () => {
	const root = await withDelta(TWO);
	const run = await minispec(root, ["validate", "c", "--strict", "--json"]);
	expect(run.code).toBe(0);
	expect(JSON.parse(run.out).summary.totals.failed).toBe(0);
	expect((await addedTexts(root)).length).toBe(2);
});

test("a closing fence is at least as long as its opener and has no info string", async () => {
	const delta = TWO.replace(MINISPEC_FENCE, "The system SHALL do One.").replace(
		"\n### Requirement: Two",
		"\n````\n```\n### Requirement: Fake\n```js\n````\n\n### Requirement: Two",
	);
	const root = await withDelta(delta);
	expect((await addedTexts(root)).length).toBe(2);
});

/** A main spec `x` with `before`, then `### Requirement: B`, and the count that `show` gives. */
const countWith = async (before: string): Promise<number> => {
	const root = await tmpEmpty("minispec-indent");
	await write(
		path.join(root, "openspec/specs/x/spec.md"),
		`## Purpose\n\nThe capability x does a thing for the tests of MiniSpec.\n\n## Requirements\n\n### Requirement: A\n\nThe system SHALL do A.\n\n${before}\n\n### Requirement: B\n\nThe system SHALL do B.\n`,
	);
	return JSON.parse((await minispec(root, ["show", "x", "--json"])).out)
		.requirementCount;
};

test("a line of 4 spaces and a fence run at the top level opens no fence", async () => {
	const count = await countWith("    ```");
	expect(count).toBe(2);
});

test("a fence in a list item opens a fence at the indent of the item content", async () => {
	const count = await countWith(
		"- step\n\n    ```\n### Requirement: Fake\n    ```",
	);
	expect(count).toBe(2);
});

const MAIN = (title: string) => `## Purpose ##

The capability x does a thing for the tests of MiniSpec.

## ${title} ##

### Requirement: A

The system SHALL do A.

#### Scenario: A Happens

- **WHEN** a condition holds
- **THEN** A follows
`;

test("closing hashes on a section title do not hide the section (OpenSpec issue #2145)", async () => {
	const delta = DELTA.replace(
		"## ADDED Requirements",
		"## ADDED Requirements ##",
	);
	const root = await withDelta(delta);
	expect((await minispec(root, ["validate", "c", "--strict"])).code).toBe(0);
	expect((await addedTexts(root)).length).toBe(1);
});

test("closing hashes on `## Requirements` and `## Purpose` of a main spec do not hide them (OpenSpec issue #2145)", async () => {
	const root = await tmpEmpty("minispec-main-hashes");
	await write(
		path.join(root, "openspec/specs/x/spec.md"),
		MAIN("Requirements"),
	);
	const shown = await minispec(root, ["show", "x", "--json"]);
	expect(JSON.parse(shown.out).requirementCount).toBe(1);
	const short = await minispec(root, ["validate", "x", "--strict", "--json"]);
	expect(short.code).toBe(0);
});

test("a main spec with a duplicate requirement fails `validate --strict` (OpenSpec issue #2132)", async () => {
	const root = await tmpEmpty("minispec-dup");
	const block =
		"The system SHALL do A.\n\n#### Scenario: S\n\n- **WHEN** a\n- **THEN** b\n";
	await write(
		path.join(root, "openspec/specs/dup/spec.md"),
		`## Purpose\n\nThe capability dup does a thing for the tests of MiniSpec.\n\n## Requirements\n\n###Requirement: Foo\n\n${block}\n### Requirement: Foo\n\n${block}`,
	);
	const run = await minispec(root, ["validate", "dup", "--strict", "--json"]);
	expect(run.code).not.toBe(0);
	const [issue] = JSON.parse(run.out).items[0].issues;
	expect(issue.level).toBe("ERROR");
	expect(issue.message).toContain("Duplicate requirement");
	expect(issue.message).toContain("Foo");
});

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

test("a fence indented with a tab in a list item opens a fence", async () => {
	const count = await countWith(
		"- step\n\n\t```\n### Requirement: Fake\n\t```",
	);
	expect(count).toBe(2);
});

test("a flag that the code reads is no unknown flag (`-r`, `--requirement`, `-y`)", async () => {
	const root = await withDelta();
	const show = await minispec(root, [
		"show",
		"c",
		"--requirement",
		"1",
		"--json",
	]);
	const archive = await minispec(root, ["archive", "c", "-y"]);
	expect(show.code).not.toBe(2);
	expect(archive.code).toBe(0);
});

/** Where each command reads its flags: the adapter file, the exported function of the command, and the text where its code starts when its helpers come first. */
const READERS: Record<string, [file: string, fn: string, from?: string]> = {
	new: ["change.ts", "newChange"],
	list: ["list.ts", "list"],
	status: ["change.ts", "changeStatus"],
	instructions: ["change.ts", "instructions"],
	show: ["list.ts", "show"],
	validate: ["check.ts", "validate"],
	schemas: ["schemas.ts", "schemas"],
	schema: ["schemas.ts", "schemaValidate"],
	sync: ["archive.ts", "sync"],
	archive: ["archive.ts", "archive", "const gate = "],
};

/** The flags that a usage line may hold with no read in the code of its command: `main` reads `--json`, and OpenSpec accepts `--deltas-only` and ignores it, because `show --json` of a change gives only deltas. */
const NO_READ: Record<string, string[]> = {
	new: ["--json"],
	list: ["--json"],
	status: ["--json"],
	instructions: ["--json"],
	show: ["--json", "--deltas-only"],
	validate: ["--json"],
	schemas: ["--json"],
	schema: ["--json"],
	archive: ["--json"],
};

test("each flag that the code reads is in the usage of its command, and each flag of the usage is read", async () => {
	const dir = path.join(REPO, "plugins/claudetto/modules/spec/adapters");
	const root = await tmpEmpty("minispec-usage");
	const unlisted: Record<string, string[]> = {};
	const unread: Record<string, string[]> = {};
	const checks = Object.entries(READERS).map(
		async ([command, [file, fn, from]]) => {
			const source = await bunFile(path.join(dir, file)).text();
			const at = source.indexOf(`export const ${fn} = `);
			const start = from ? source.indexOf(from) : at;
			const end = source.indexOf("\nexport const ", at + 1);
			expect(at).toBeGreaterThan(-1);
			expect(start).toBeGreaterThan(-1);
			const read = new Set(
				[
					...source
						.slice(start, end < 0 ? undefined : end)
						.matchAll(/"(-{1,2}[a-z][\w-]*)"/g),
				].map((m) => m[1] ?? ""),
			);
			const usage = (await minispec(root, ["help", command])).out;
			const listed = new Set(usage.match(/(?<![\w-])-{1,2}[a-z][\w-]*/g));
			const lacks = [...read].filter((f) => !listed.has(f));
			const idle = [...listed].filter(
				(f) => !read.has(f) && !(NO_READ[command] ?? []).includes(f),
			);
			return { command, lacks, idle };
		},
	);
	for (const { command, lacks, idle } of await Promise.all(checks)) {
		if (lacks.length > 0) {
			unlisted[command] = lacks;
		}
		if (idle.length > 0) {
			unread[command] = idle;
		}
	}
	expect(unlisted).toEqual({});
	expect(unread).toEqual({});
});

test("`--deltas-only` is accepted, and `show --json` of a change gives the same deltas, as in OpenSpec", async () => {
	const root = await withDelta();
	const plain = await minispec(root, ["show", "c", "--json"]);
	const only = await minispec(root, ["show", "c", "--json", "--deltas-only"]);
	expect(only.code).toBe(0);
	expect(only.out).toBe(plain.out);
});

test("a tab after a list marker opens an item with content at column 4", async () => {
	const root = await withDelta(
		`${DELTA}\n-\tnote\n\n\t\`\`\`\n### Requirement: Hidden\n\n#### Scenario: Hidden Happens\n\n- **WHEN** a\n- **THEN** b\n\t\`\`\`\n\n### Requirement: Shown\n\nThe system SHALL do Shown.\n\n#### Scenario: Shown Happens\n\n- **WHEN** a condition holds\n- **THEN** Shown follows\n`,
	);
	const names = (await addedTexts(root)).map((t) => SHALL_DO.exec(t)?.[1]);
	expect(names).not.toContain("Hidden");
	expect(names).toContain("Shown");
	const run = await minispec(root, ["show", "c", "--json", "--deltas-only"]);
	const listed = JSON.parse(run.out).deltas.map(
		(d: { requirement: { name?: string } }) => d.requirement.name,
	);
	expect(listed).not.toContain("Hidden");
});

test("a flag value with `=` stays whole, and a flag with `=` still splits", async () => {
	const root = await tmpEmpty("minispec-eq");
	const run = await minispec(root, [
		"new",
		"change",
		"z",
		"--description",
		"--x=y",
	]);
	expect(run.code).toBe(0);
	expect(
		await bunFile(path.join(root, "openspec/changes/z/README.md")).text(),
	).toContain("--x=y");
});

test("the `=` split and the flag check agree on which argument is a value", async () => {
	const root = await tmpEmpty("minispec-walk");
	const run = await minispec(root, [
		"new",
		"change",
		"z",
		"--description",
		"--goal",
		"--json=1",
	]);
	expect(run.code).toBe(0);
	expect(
		await bunFile(path.join(root, "openspec/changes/z/README.md")).text(),
	).toContain("--goal");
});

/** A project with the main spec `auth` that holds the requirements `A` and `B`. */
const withAuth = async (): Promise<string> => {
	const root = await tmpEmpty("minispec-auth");
	await write(
		path.join(root, "openspec/specs/auth/spec.md"),
		"## Purpose\n\nThe capability auth does a thing for the tests of MiniSpec.\n\n## Requirements\n\n### Requirement: A\n\nThe system SHALL do A.\n\n#### Scenario: A Happens\n\n- **WHEN** a condition holds\n- **THEN** A follows\n\n### Requirement: B\n\nThe system SHALL do B.\n\n#### Scenario: B Happens\n\n- **WHEN** a condition holds\n- **THEN** B follows\n",
	);
	return root;
};

test("`show -r 1 auth` takes `auth` as the name, and `-r=1` reads as `-r 1`", async () => {
	const root = await withAuth();
	const apart = await minispec(root, ["show", "-r", "1", "auth", "--json"]);
	const joined = await minispec(root, ["show", "auth", "-r=1", "--json"]);
	expect(apart.code).toBe(0);
	expect(JSON.parse(apart.out).requirementCount).toBe(1);
	expect(joined.code).toBe(0);
	expect(joined.out).toBe(apart.out);
});

test("`show auth -r` with no value, an empty value, or a value that is not a whole number fails with exit 2", async () => {
	const root = await withAuth();

	const runs = await Promise.all(
		[["-r="], ["-r=abc"], ["-r=1e0"], ["--json", "-r"]].map((r) =>
			minispec(root, ["show", "auth", ...r]),
		),
	);

	expect(runs.map((r) => r.code)).toEqual([2, 2, 2, 2]);
});

test("the value of `--json=--help` stays a value, as in the first walk", async () => {
	const root = await withAuth();

	const run = await minispec(root, ["show", "auth", "--json=--help"]);

	expect(run.code).toBe(0);
	expect(JSON.parse(run.out).requirementCount).toBe(2);
});

/** The names of the requirements that `show c --json --deltas-only` lists for the delta with the list item `item`, then a fence of 4 spaces that hides `Hidden`, and a real `Shown`. */
const listedAfter = async (item: string): Promise<string[]> => {
	const root = await withDelta(
		`${DELTA}\n${item}\n    \`\`\`\n### Requirement: Hidden\n\n#### Scenario: Hidden Happens\n\n- **WHEN** a\n- **THEN** b\n    \`\`\`\n\n### Requirement: Shown\n\nThe system SHALL do Shown.\n\n#### Scenario: Shown Happens\n\n- **WHEN** a condition holds\n- **THEN** Shown follows\n`,
	);
	const run = await minispec(root, ["show", "c", "--json", "--deltas-only"]);
	return JSON.parse(run.out)
		.deltas.filter((d: { operation: string }) => d.operation === "ADDED")
		.map((d: { requirement: { name: string } }) => d.requirement.name);
};

test("5 or more columns after a list marker give the item the width of the marker plus 1", async () => {
	const names = await listedAfter("-\t\tx");
	expect(names).toContain("Shown");
	expect(names).not.toContain("Hidden");
});

test("an empty list item has the width of its marker plus 1", async () => {
	const names = await listedAfter("-");
	expect(names).toContain("Shown");
	expect(names).not.toContain("Hidden");
});

test("a thematic break is no list item, so a fence of 4 spaces after it is indented code", async () => {
	const listed = await Promise.all(
		["* * *", "- - -", "***"].map((rule) => listedAfter(rule)),
	);
	for (const names of listed) {
		expect(names).toContain("Hidden");
	}
});

test("a blank line after an empty list item closes the item", async () => {
	expect(await listedAfter("-\n")).toContain("Hidden");
});

test("a name by position reads from the walk, in any order of flags and words", async () => {
	const root = await tmpEmpty("minispec-order");
	const run = await minispec(root, [
		"new",
		"change",
		"--description",
		"x",
		"z",
	]);
	expect(run.code).toBe(0);
	expect(await exists(path.join(root, "openspec/changes/z"))).toBe(true);
	const target = await withDelta();
	expect((await minispec(target, ["new", "change", "a-x"])).code).toBe(0);
	const archived = await minispec(target, [
		"archive",
		"--skip-specs",
		"a-x",
		"--yes",
		"--no-validate",
	]);
	expect(archived.code).toBe(0);
	expect(
		(await readdir(path.join(target, "openspec/changes/archive"))).join(),
	).toContain("a-x");
});

test("a boolean flag reads from the walk, so the value of a flag is no flag", async () => {
	const root = await tmpEmpty("minispec-bool");
	const run = await minispec(root, [
		"new",
		"change",
		"z2",
		"--description",
		"--json",
	]);
	expect(run.code).toBe(0);
	expect(run.out).not.toContain('"change"');
	const sorted = await minispec(root, ["list", "--sort", "--json"]);
	expect(() => JSON.parse(sorted.out)).toThrow();
});

test("no adapter reads the raw arguments", async () => {
	const dir = path.join(PRESETS, "../adapters");
	const adapters = (await readdir(dir)).filter((file) => file !== "cli.ts");
	const sources = await Promise.all(
		adapters.map((file) => bunFile(path.join(dir, file)).text()),
	);
	for (const source of sources) {
		expect(source).not.toMatch(RAW_ARGS);
	}
});
