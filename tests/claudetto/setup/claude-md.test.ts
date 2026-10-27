// The global `~/.claude/CLAUDE.md` of setup and the inventory of `~/.claude/rules/*.md` (task 3.9 of change `release-0-3-0-alpha-2`, spec `setup`, "Global Memory File").

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { ruleRows } from "../../../plugins/claudetto/modules/setup/domain/claude-md.ts";
import { GLOBAL_CLAUDE_MD_MAX_LINES } from "../../../plugins/claudetto/modules/setup/limits.ts";
import { runMain } from "../../support/setup-run.ts";

const PATTERN_1 = /\n$/;

const START =
	"<!-- claudetto setup: /claudetto:setup rewrites only this block -->";
const END = "<!-- /claudetto setup -->";

/** A new folder that is the config folder and the project, with `files` in it. */
const folder = async (files: Record<string, string> = {}) => {
	const dir = await mkdtemp(path.join(os.tmpdir(), "setup-global-"));
	await Promise.all(
		Object.entries(files).map(([file, text]) =>
			bunWrite(path.join(dir, file), text),
		),
	);
	return dir;
};

const read = (dir: string, file: string) =>
	bunFile(path.join(dir, file)).text();

const lines = (text: string) => text.replace(PATTERN_1, "").split("\n");

/** The lines between the comments of the block. */
const blockOf = (text: string) =>
	lines(text.split(START)[1]?.split(END)[0]?.trim() ?? "");

test("a new file gets the origin line and the 3 rules of claudetto in the block", async () => {
	const dir = await folder();

	await runMain(dir, ["--claude-md", "--apply"]);

	expect(blockOf(await read(dir, "CLAUDE.md"))).toHaveLength(4);
});

test("a file with an old block gets the block of a new file, and keeps each user line", async () => {
	const fresh = await folder();
	await runMain(fresh, ["--claude-md", "--apply"]);
	const dir = await folder({
		"CLAUDE.md": `# CLAUDE.md\n${START}\nOld origin line.\n${END}\n\n- Mine.\n`,
	});

	await runMain(dir, ["--claude-md", "--apply"]);

	const text = await read(dir, "CLAUDE.md");
	expect(blockOf(text)).toEqual(blockOf(await read(fresh, "CLAUDE.md")));
	expect(text.endsWith(`\n${END}\n\n- Mine.\n`)).toBe(true);
});

test("a file with an old block that the new rules push past the bound stays as it is", async () => {
	const many = Array.from({ length: 15 }, (_, i) => `- Rule ${i}.`).join("\n");
	const old = `# CLAUDE.md\n${START}\nOld origin line.\n${END}\n${many}\n`;
	const dir = await folder({ "CLAUDE.md": old });

	const { status } = await runMain(dir, ["--claude-md", "--apply"]);

	expect(lines(old).length).toBeLessThanOrEqual(GLOBAL_CLAUDE_MD_MAX_LINES);
	expect(status).toBe(1);
	expect(await read(dir, "CLAUDE.md")).toBe(old);
});

test("New Global File: the file starts with `# CLAUDE.md`, holds the rules of the user, and has 20 lines or fewer", async () => {
	const dir = await folder();
	const rules = ["## Prose", "- One sentence per line.", "- No semicolons."];
	const { status } = await runMain(dir, [
		"--claude-md",
		...rules.map((r) => `--claude-md-rule=${r}`),
		"--apply",
	]);
	const text = await read(dir, "CLAUDE.md");
	expect(status).toBe(0);
	expect(lines(text)[0]).toBe("# CLAUDE.md");
	expect(text.split(START)[1]?.split(END)[1]).toContain("- No semicolons.");
	expect(lines(text).length).toBeLessThanOrEqual(GLOBAL_CLAUDE_MD_MAX_LINES);
});

test("the dry run writes nothing", async () => {
	const dir = await folder();
	const { status } = await runMain(dir, ["--claude-md"]);
	expect(status).toBe(0);
	expect(await bunFile(path.join(dir, "CLAUDE.md")).exists()).toBe(false);
});

test("User Lines Stay: setup rewrites only the lines between the comments, and a second run changes nothing", async () => {
	const dir = await folder({
		"CLAUDE.md": `# CLAUDE.md\n${START}\nOld origin line.\n${END}\n\n- Mine one.\n- Mine two.\n`,
	});
	const args = [
		"--claude-md",
		"--claude-md-rule=- Not for an old file",
		"--apply",
	];
	await runMain(dir, args);
	const once = await read(dir, "CLAUDE.md");
	expect(once.startsWith(`# CLAUDE.md\n${START}\n`)).toBe(true);
	expect(once.endsWith(`\n${END}\n\n- Mine one.\n- Mine two.\n`)).toBe(true);
	expect(once).not.toContain("Old origin line.");
	await runMain(dir, args);
	expect(await read(dir, "CLAUDE.md")).toBe(once);
});

test("a file with no block gets the block under its title, and keeps each line", async () => {
	const dir = await folder({ "CLAUDE.md": "# CLAUDE.md\n- Mine.\n" });
	await runMain(dir, ["--claude-md", "--apply"]);
	const text = await read(dir, "CLAUDE.md");
	expect(text.startsWith(`# CLAUDE.md\n${START}\n`)).toBe(true);
	expect(text.endsWith(`\n${END}\n- Mine.\n`)).toBe(true);
});

test("a start comment with no end comment gets one block, and a second run changes nothing", async () => {
	const dir = await folder({ "CLAUDE.md": `# CLAUDE.md\n${START}\n- Mine.\n` });
	const args = ["--claude-md", "--apply"];

	await runMain(dir, args);
	const once = await read(dir, "CLAUDE.md");
	await runMain(dir, args);

	expect(once.split(START)).toHaveLength(2);
	expect(once.endsWith(`\n${END}\n- Mine.\n`)).toBe(true);
	expect(await read(dir, "CLAUDE.md")).toBe(once);
});

test("Over the Bound: more than 20 lines write nothing and ask which lines move to `~/.claude/rules/`", async () => {
	const many = Array.from({ length: 20 }, (_, i) => `- Rule ${i}.`).join("\n");
	const old = `# CLAUDE.md\n${many}\n`;
	const dir = await folder({ "CLAUDE.md": old });
	const { status, text } = await runMain(dir, ["--claude-md", "--apply"]);
	expect(status).toBe(1);
	expect(text).toContain("~/.claude/rules/");
	expect(await read(dir, "CLAUDE.md")).toBe(old);
	const fresh = await folder();
	const rules = Array.from(
		{ length: 20 },
		(_, i) => `--claude-md-rule=- Rule ${i}.`,
	);
	const run = await runMain(fresh, ["--claude-md", ...rules, "--apply"]);
	expect(run.status).toBe(1);
	expect(await bunFile(path.join(fresh, "CLAUDE.md")).exists()).toBe(false);
});

test("Owned Rule Stays: `context7.md` with its paired skill and `claudetto:find-docs` on gets the `ctx7` removal offer, and setup leaves the file", async () => {
	const rule = "Use ctx7 for docs. My own edit.\n";
	const dir = await folder({
		"rules/context7.md": rule,
		"rules/mine.md": "A rule of mine.\n",
		"skills/find-docs/SKILL.md":
			"---\nname: find-docs\ndescription: Docs.\n---\n",
		"settings.json": JSON.stringify({
			enabledPlugins: { "claudetto@claudetto": true },
		}),
	});
	const inventory = JSON.parse((await runMain(dir, ["--inventory"])).text);
	const owned = inventory.rules.find(
		(r: { file: string }) => r.file === "rules/context7.md",
	);
	expect(owned.owner).toBe("ctx7");
	expect(owned.removal).toBe("ctx7 remove --claude --cli");
	expect(owned.foldOrRemove).toBeUndefined();
	const other = inventory.rules.find(
		(r: { file: string }) => r.file === "rules/mine.md",
	);
	expect(other.owner).toBeUndefined();
	expect(other.foldOrRemove).toBe(true);
	await runMain(dir, ["--claude-md", "--apply"]);
	await runMain(dir, ["--scope", "user", "--apply"]);
	expect(await read(dir, "rules/context7.md")).toBe(rule);
});

test("a `context7.md` with no paired skill has no owner, and with `claudetto` off it gets no removal offer", async () => {
	const dir = await folder({ "rules/context7.md": "x\n" });
	const [row] = JSON.parse((await runMain(dir, ["--inventory"])).text).rules;
	expect(row.owner).toBeUndefined();
	expect(row.foldOrRemove).toBe(true);
	const off = await folder({
		"rules/context7.md": "x\n",
		"skills/find-docs/SKILL.md": "x",
	});
	const [owned] = JSON.parse((await runMain(off, ["--inventory"])).text).rules;
	expect(owned.owner).toBe("ctx7");
	expect(owned.removal).toBeUndefined();
});

const TESTS_RULE = "rules/claudetto-tests.md";

test("`--claude-md --apply` writes the rule for test files with its `paths:` list", async () => {
	const dir = await folder();

	const { status } = await runMain(dir, ["--claude-md", "--apply"]);

	const text = await read(dir, TESTS_RULE);
	expect(status).toBe(0);
	expect(text.startsWith("---\npaths:\n")).toBe(true);
	for (const glob of ["**/*.test.*", "**/tests/**", "**/__tests__/**"]) {
		expect(text).toContain(`  - "${glob}"\n`);
	}
});

test("an existing rule file for test files stays as the user edited it", async () => {
	const edited = '---\npaths:\n  - "**/*.test.*"\n---\n\nMy own rule.\n';
	const dir = await folder({ [TESTS_RULE]: edited });

	await runMain(dir, ["--claude-md", "--apply"]);

	expect(await read(dir, TESTS_RULE)).toBe(edited);
});

test("`ruleRows` gives the rule file for test files the owner `claudetto` and no offer", () => {
	const rules: [string, number][] = [["claudetto-tests.md", 400]];

	const [row] = ruleRows(rules, [], true);

	expect(row).toEqual({ file: TESTS_RULE, chars: 400, owner: "claudetto" });
});

test("the dry run writes no rule file", async () => {
	const dir = await folder();

	await runMain(dir, ["--claude-md"]);

	expect(await bunFile(path.join(dir, TESTS_RULE)).exists()).toBe(false);
});

test("`--claude-md` with `--inventory` prints the usage and exits with code 2", async () => {
	const dir = await folder();
	expect((await runMain(dir, ["--claude-md", "--inventory"])).status).toBe(2);
});

test("the old flag `--global-md` exits with code 2 and writes no file", async () => {
	const dir = await folder();

	const run = await runMain(dir, ["--global-md", "--apply"]);

	expect(run.status).toBe(2);
	expect(await bunFile(path.join(dir, "CLAUDE.md")).exists()).toBe(false);
});
