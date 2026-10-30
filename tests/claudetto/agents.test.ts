import { expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, Glob } from "bun";

const AGENTS = join(import.meta.dir, "../../plugins/claudetto/agents");

const MODEL_LINE = /^model\s*:/m;

/** The frontmatter between the first two `---` lines, or an empty string with none. */
const frontmatterOf = (text: string): string => {
	const lines = text.split("\n");
	if (lines[0] !== "---") {
		return "";
	}
	const end = lines.indexOf("---", 1);
	return end < 0 ? "" : lines.slice(1, end).join("\n");
};

test("the frontmatter reader finds a model line where one exists", () => {
	const text = `---
name: a
model: claude-haiku-5-5
---
body
`;

	expect(MODEL_LINE.test(frontmatterOf(text))).toBe(true);
});

test("no agent file carries a model line, so the tier row decides", async () => {
	const names: string[] = [];
	for await (const name of new Glob("*.md").scan(AGENTS)) {
		names.push(name);
	}

	const texts = await Promise.all(
		names.map((name) => bunFile(join(AGENTS, name)).text()),
	);

	expect(names.length).toBeGreaterThan(0);
	expect(texts.filter((text) => MODEL_LINE.test(frontmatterOf(text)))).toEqual(
		[],
	);
});
