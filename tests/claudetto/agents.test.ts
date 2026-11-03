import { expect, test } from "bun:test";

const MODEL_LINE = /^model\s*:/m;

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
