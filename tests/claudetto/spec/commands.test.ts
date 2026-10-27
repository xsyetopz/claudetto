// The scenarios of `minispec` (change `0-3-0`, task 8.2) that the parity test does not cover: the commands, the fences, and the headings.

import { expect, test } from "bun:test";
import { cp, readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, spawn, write } from "bun";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../tools/limits.ts";
import {
	minispec,
	openspec,
	PRESETS,
	sampleProject,
	tmpEmpty,
} from "../../support/openspec.ts";
import { REPO } from "../../support/repo.ts";
import {
	addedTexts,
	countWith,
	DELTA,
	exists,
	filesOf,
	withDelta,
} from "./workspace.ts";

const SCENARIO_ONWARD = /#### Scenario[\s\S]*$/;
const ARCHIVED_NAME = /^\d{4}-\d{2}-\d{2}-c$/;
const ONE = /\b1\b/;
const MINISPEC_FENCE = /^`{3}minispec.*$/m;

/** Runs the `args` on a project with a delta, and gives the code and the text of `openspec/specs/x/spec.md`. */
const mergesDelta = async (root: string, args: string[]) => {
	const run = await minispec(root, args);
	const spec = await bunFile(
		path.join(root, "openspec/specs/x/spec.md"),
	).text();
	return { code: run.code, spec };
};

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
