// The scenarios of `minispec` (change `0-3-0`, task 8.2) that the parity test does not cover: the flags, the arguments, and the usage.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, write } from "bun";
import { minispec, PRESETS, tmpEmpty } from "../../support/openspec.ts";
import { REPO } from "../../support/repo.ts";
import {
	addedTexts,
	countWith,
	DELTA,
	exists,
	withDelta,
} from "./workspace.ts";

const SHALL_DO = /SHALL do (\w+)/;
const RAW_ARGS = /\bargs\b/;

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
