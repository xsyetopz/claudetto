import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

const RULES = `${import.meta.dir}/../plugins/claudetto/rules`;
const NAMES = [
	"findFactsByExperiment",
	"lookForAClone",
	"noImpossibleStateGuards",
	"noUnrequestedEdits",
	"useBlockLanguage",
	"useLeastCode",
	"useOneObviousWay",
];
const MAX_LINES = 4;

test("the shipped rules are the seven", async () => {
	const files = await readdir(RULES);

	expect(files).toHaveLength(NAMES.length);
	for (const name of NAMES) {
		expect(files).toContain(`${name}.md`);
	}
});

// Claude Code loads a rule file with no `paths` frontmatter at the start of a session,
// and one with `paths` after the first read of a matching file.
for (const name of NAMES) {
	test(`${name} holds no frontmatter, a few lines, and a reason`, async () => {
		const text = await Bun.file(`${RULES}/${name}.md`).text();
		const lines = text.split("\n").filter((l) => l.trim() !== "");

		expect(text).not.toMatch(/^---/u);
		expect(lines.length).toBeGreaterThan(0);
		expect(lines.length).toBeLessThanOrEqual(MAX_LINES);
		expect(text).toMatch(/\bbecause\b/u);
	});
}
