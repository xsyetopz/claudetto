// The `setup` skill: a user-invoked skill that runs the CLI `claudetto-setup`.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile } from "bun";
import { REPO } from "../../support/repo.ts";

const PATTERN_1 = /^---\n([\s\S]*?)\n---/;
const PATTERN_2 = /^([\w-]+):\s*(.*)$/;
const PATTERN_3 = /^"(.*)"$/;

const PLUGIN = path.join(REPO, "plugins/claudetto");

/** The frontmatter keys of a skill file, as strings. */
const frontmatter = (text: string): Record<string, string> => {
	const block = PATTERN_1.exec(text)?.[1] ?? "";
	return Object.fromEntries(
		block
			.split("\n")
			.map((line) => PATTERN_2.exec(line))
			.filter((m): m is RegExpExecArray => m !== null)
			.map(([, key, value]) => [
				key ?? "",
				(value ?? "").replace(PATTERN_3, "$1"),
			]),
	);
};

test("the frontmatter reader handles quotes and a missing block", () => {
	expect(
		frontmatter('---\nname: a\nargument-hint: "[x]"\n---\nbody'),
	).toStrictEqual({ name: "a", "argument-hint": "[x]" });
	expect(frontmatter("no block")).toStrictEqual({});
});

test("the skill `setup` has a name, a description, and no model invocation", async () => {
	const meta = frontmatter(
		await bunFile(path.join(PLUGIN, "skills/setup/SKILL.md")).text(),
	);
	expect(meta["name"]).toBe("setup");
	expect((meta["description"] ?? "").length).toBeGreaterThan(0);
	expect(meta["disable-model-invocation"]).toBe("true");
});

test("the plugin ships the launcher of the CLI that the skill runs", async () => {
	expect(await bunFile(path.join(PLUGIN, "bin/claudetto-setup")).exists()).toBe(
		true,
	);
});
