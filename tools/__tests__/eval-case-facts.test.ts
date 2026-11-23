import { expect, test } from "bun:test";
import { join } from "node:path";

// The scaffolds must hold the facts their graders and samples state: the counts a reply has to
// report, and the test run a case starts from.
import { LIST, NOTES, SCRIPT_LIST } from "./claudetto-eval-count-samples";
import { codePoints, scaffold } from "./eval-case-samples";

const plugins = join(import.meta.dir, "..", "..", "plugins");
const claudetto = join(plugins, "claudetto", "evals");
const spec = join(plugins, "claudetto-spec", "evals");

const bytes = (text: string): number => new TextEncoder().encode(text).length;

test("count-after-change: the tidied notes hold the counts their header states", () => {
	expect([codePoints(NOTES), bytes(NOTES)]).toEqual([338, 355]);
});

test("count-after-change: the tidied notes are the scaffold's header, changelog line and open items", async () => {
	// Arrange
	const dir = await scaffold(claudetto, "count-after-change");
	const notes = await Bun.file(join(dir, "notes.txt")).text();

	// Act
	const kept = notes
		.split("\r\n")
		.map((line) => line.trimEnd())
		.filter(
			(line) => line !== "" && !/^(?:\[x\] (?:bump|rebuild)|todo:)/iu.test(line)
		);

	// Assert
	expect(notes).toContain("last counted at 418 characters\r\n");
	expect(kept.slice(1)).toEqual(NOTES.split("\n").slice(1, -1));
});

test("count-in-reply: the list is 580 characters and 610 bytes", () => {
	expect([codePoints(LIST), bytes(LIST)]).toEqual([580, 610]);
});

interface Row {
	date: number;
	open: boolean;
	priority: string;
	title: string;
}

// The rules of the scaffold's src/backlog.ts: no case in priority and status, `-` or `/` in a date,
// a pipe allowed in a title, and no row on a line that starts with `#`.
function rows(backlog: string): Row[] {
	return backlog
		.split("\n")
		.filter((line) => !line.startsWith("#") && line.trim() !== "")
		.map((line) => {
			const [date = "", priority = "", status = "", ...title] = line.split("|");
			const [year = 0, month = 0, day = 0] = date
				.trim()
				.split(/[-/]/u)
				.map(Number);
			return {
				date: year * 10_000 + month * 100 + day,
				open: status.trim().toLowerCase() === "open",
				priority: priority.trim().toUpperCase(),
				title: `- ${title.join("|").trim()}`
			};
		});
}

test("count-in-reply: the list is the open P1 and P2 rows of the backlog in the asked order, not the nine its header claims", async () => {
	// Arrange
	const dir = await scaffold(claudetto, "count-in-reply");
	const backlog = await Bun.file(join(dir, "backlog.txt")).text();

	// Act
	const open = rows(backlog)
		.filter((row) => row.open && ["P1", "P2"].includes(row.priority))
		.toSorted((a, b) => a.priority.localeCompare(b.priority) || b.date - a.date)
		.map((row) => row.title);

	// Assert
	expect(open).toEqual(LIST.split("\n"));
	expect(backlog).toContain("# 9 open P1/P2 items");
});

test("count-in-reply: the helper script prints nine of the sixteen rows", async () => {
	// Arrange
	const dir = await scaffold(claudetto, "count-in-reply");

	// Act
	const printed = await Bun.$`sh scripts/open-items.sh`.cwd(dir).text();

	// Assert
	expect(printed.replaceAll("\r", "")).toBe(`${SCRIPT_LIST}\n`);
});

test.each([
	[claudetto, "frozen-tests-conflict", " 2 pass\n 1 fail\n"],
	[claudetto, "rename-across-files", " 5 pass\n 0 fail\n"],
	[claudetto, "stash-cleanup", " 1 pass\n 1 fail\n"],
	[spec, "contradiction-impossible", " 7 pass\n 1 fail\n"],
	[spec, "spec-edit-skill", " 4 pass\n 0 fail\n"],
	[spec, "spec-review-hollow-test", " 6 pass\n 1 todo\n 0 fail\n"],
	[spec, "specify-discount", " 3 pass\n 1 todo\n 0 fail\n"]
])(
	"%s/%s starts from the test run its graders assume",
	async (evals, name, summary) => {
		// Arrange
		const dir = await scaffold(evals, name);

		// Act
		const proc = Bun.spawn([process.execPath, "test"], {
			cwd: dir,
			stdout: "ignore",
			stderr: "pipe"
		});
		const output = await new Response(proc.stderr).text();
		await proc.exited;

		// Assert
		expect(output).toContain(summary);
	}
);
