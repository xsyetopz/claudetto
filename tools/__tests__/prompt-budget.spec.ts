import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	BUDGET_HEADING,
	budgetFaults,
	parseBudgets,
	promptChars,
	promptRequestChars,
	readBudgets,
	sentChars,
	sentRequestChars,
} from "../prompt-budgets.ts";

const page = (rows: string): string =>
	`${BUDGET_HEADING}\n\nSome prose.\n\n| Piece | Kind | Budget | Measured as | Reading |\n| --- | --- | --- | --- | --- |\n${rows}\n\nMore prose.\n`;

describe("the budget table of the page", () => {
	test("each shipped piece has a budget and a reading", async () => {
		const budgets = await readBudgets();

		expect(budgets.map((row) => row.piece)).toEqual([
			"agents/main.md",
			"output-styles/Concise.md",
			"Agent",
			"Bash",
			"Read",
			"Skill",
			"ToolSearch",
		]);
		for (const row of budgets) {
			expect(row.budget).toBeGreaterThan(0);
			expect(row.reading.length).toBeGreaterThan(0);
		}
	});

	test("the prose around the table is not read as a row", () => {
		const budgets = parseBudgets(
			page("| `a.md` | file | 1,234 | `characters` | a reading |"),
		);

		expect(budgets).toEqual([
			{
				piece: "a.md",
				kind: "file",
				budget: 1234,
				measuredAs: "characters",
				reading: "a reading",
			},
		]);
	});

	test("a page with no such heading has no budgets", () => {
		const text = `# Other Page

No table here.
`;

		expect(parseBudgets(text)).toEqual([]);
	});
});

describe("no shipped piece is over its budget", () => {
	test("the table of the page has no fault", async () => {
		expect(await budgetFaults(await readBudgets())).toEqual([]);
	});

	test("the main prompt is under the body it replaces in the request", async () => {
		const sent = await promptRequestChars("agents/main.md");

		expect(sent).toBeLessThan(5680);
	});

	test("the style is under the built-in style it stands in for", async () => {
		const chars = await promptChars("output-styles/Concise.md");

		expect(chars).toBeLessThan(1540);
	});
});

describe("the check names each fault of a row", () => {
	test("a file over its budget", async () => {
		const root = await mkdtemp(join(tmpdir(), "claudetto-budget-"));
		await writeFile(
			join(root, "big.md"),
			`---
name: big
---

12345
`,
		);
		const budgets = parseBudgets(
			page("| `big.md` | file | 3 | `characters` | a test |"),
		);

		const faults = await budgetFaults(budgets, root);

		expect(faults).toEqual([
			"big.md is 5 characters, over its budget of 3 from a test",
		]);
	});

	test("a budget whose file is missing", async () => {
		const budgets = parseBudgets(
			page("| `agents/no-such.md` | file | 5,627 | `characters` | a test |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("is missing");
	});

	test("a budget with no reading", async () => {
		const budgets = parseBudgets(
			page("| `agents/main.md` | file | 5,627 | `characters` |  |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toEqual([
			"agents/main.md has a budget of 5627 and no reading",
		]);
	});

	test("a tool budget that disagrees with its stock reading", async () => {
		const budgets = parseBudgets(
			page("| `Bash` | tool text | 9,999 | `characters` | a test |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toEqual([
			"Bash has the budget 9999, and its stock reading is 1267",
		]);
	});

	test("a tool text that does not ship", async () => {
		const budgets = parseBudgets(
			page("| `Glob` | tool text | 100 | `characters` | a test |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toEqual([
			"Glob is in the table as a tool text, and no text of that name ships",
		]);
	});

	test("a row whose kind is neither a file nor a tool text", async () => {
		const budgets = parseBudgets(
			page("| `x` | skill | 100 | `characters` | a test |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toEqual([
			'x has the kind "skill", which is neither "file" nor "tool text"',
		]);
	});
});

describe("the count is the text the harness sends", () => {
	test("front matter is not counted, because the harness does not send it", () => {
		const text = '---\nname: main\ndescription: "x"\n---\n\nbody text\n';

		expect(sentChars(text)).toBe("body text".length);
	});

	test("a file with no front matter is counted whole", () => {
		expect(sentChars("plain body\n")).toBe("plain body".length);
	});

	test("a newline costs one character and two in the request", () => {
		const text = `a
b`;

		expect(sentChars(text)).toBe(3);
		expect(sentRequestChars(text)).toBe(4);
	});

	test("a body can lose a character and cost the request the same", () => {
		const before = "aaaa";
		const after = `a
a`;

		expect(sentChars(after)).toBe(sentChars(before) - 1);
		expect(sentRequestChars(after)).toBe(sentRequestChars(before));
	});

	test("a row measured as request JSON is checked in that unit", async () => {
		const root = await mkdtemp(join(tmpdir(), "claudetto-budget-"));
		await writeFile(
			join(root, "nl.md"),
			`a
b
`,
		);
		const budgets = parseBudgets(
			page("| `nl.md` | file | 3 | `request JSON` | a test |"),
		);

		const faults = await budgetFaults(budgets, root);

		expect(faults).toEqual([
			"nl.md is 4 request JSON, over its budget of 3 from a test",
		]);
	});

	test("a row measured in an unknown unit is a fault", async () => {
		const budgets = parseBudgets(
			page("| `agents/main.md` | file | 100 | `bytes` | a test |"),
		);

		const faults = await budgetFaults(budgets);

		expect(faults).toEqual([
			'agents/main.md is measured as "bytes", which is neither "characters" nor "request JSON"',
		]);
	});
});
