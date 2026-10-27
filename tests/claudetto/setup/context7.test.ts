// Setup names the official Context7 skill `find-docs` and a Context7 rule next to `claudetto:find-docs`, and deletes neither (task 7.3a of change `0-3-0`, design D11).

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write, YAML } from "bun";
import { main } from "../../../plugins/claudetto/modules/setup/adapters/cli.ts";

const PATTERN_1 = /^---$/m;

/** The `description` of the frontmatter of the skill file `text`. */
const description = (text: string): string => {
	const front = YAML.parse(text.split(PATTERN_1)[1] ?? "");
	if (
		typeof front !== "object" ||
		front === null ||
		!("description" in front) ||
		typeof front.description !== "string"
	) {
		throw new Error("the skill has no `description`");
	}
	return front.description;
};

const SKILL =
	"---\nname: find-docs\ndescription: >-\n  Gets docs\n  of a library.\n---\n\nBody.\n";
const RULE = "Use the `ctx7` CLI to fetch current documentation.\n";

test("setup names the `find-docs` skill and the Context7 rule of the user and the project with their sizes, and keeps both files", async () => {
	const home = await mkdtemp(path.join(os.tmpdir(), "context7-"));
	const project = path.join(home, "project");
	const files = [
		path.join(home, "skills", "find-docs", "SKILL.md"),
		path.join(home, "rules", "context7.md"),
		path.join(project, ".claude", "rules", "context7.md"),
	];
	await Promise.all(
		files.map(async (file, i) => {
			await mkdir(path.dirname(file), { recursive: true });
			await write(file, i === 0 ? SKILL : RULE);
		}),
	);
	const lines: string[] = [];
	const io = {
		log: (l: string) => lines.push(l),
		error: (l: string) => lines.push(l),
	};
	const env = { CLAUDE_CONFIG_DIR: home, CLAUDE_PROJECT_DIR: project };
	expect(await main(["--scope", "user", "--apply"], env, project, io)).toBe(0);
	const text = lines.join("\n");
	const sizes = [description(SKILL).length, RULE.length, RULE.length];
	for (const [i, file] of files.entries()) {
		expect(text).toContain(`${file}: ${sizes[i]} characters`);
	}
	const own = await bunFile(
		"plugins/claudetto/skills/find-docs/SKILL.md",
	).text();
	expect(text).toContain(`with ${description(own).length} characters`);
	const present = await Promise.all(
		files.map((file) => bunFile(file).exists()),
	);
	expect(present).toStrictEqual([true, true, true]);
});
