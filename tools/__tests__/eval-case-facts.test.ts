import { expect, test } from "bun:test";
import { join } from "node:path";

// The scaffolds must hold the facts their graders and samples state: the counts a reply has to
// report, and the test run a case starts from.
import { LIST, NOTES } from "./claudetto-eval-samples";
import { codePoints, scaffold } from "./eval-case-samples";

const plugins = join(import.meta.dir, "..", "..", "plugins");
const claudetto = join(plugins, "claudetto", "evals");
const spec = join(plugins, "claudetto-spec", "evals");

const bytes = (text: string): number => new TextEncoder().encode(text).length;

test("count-after-change: the tidied notes hold the counts their header states", () => {
	expect([codePoints(NOTES), bytes(NOTES)]).toEqual([279, 290]);
});

test("count-in-reply: the list is 401 characters and 425 bytes", () => {
	expect([codePoints(LIST), bytes(LIST)]).toEqual([401, 425]);
});

test("count-in-reply: the list is the open P1 and P2 rows of the backlog, not the nine its header claims", async () => {
	// Arrange
	const dir = await scaffold(claudetto, "count-in-reply");
	const backlog = await Bun.file(join(dir, "backlog.txt")).text();

	// Act
	const open = backlog
		.split("\n")
		.map((line) => line.split("|").map((cell) => cell.trim()))
		.filter(
			(cells) => ["P1", "P2"].includes(cells[1] ?? "") && cells[2] === "open"
		)
		.map((cells) => `- ${cells.slice(3).join(" | ")}`);

	// Assert
	expect(open.toSorted()).toEqual(LIST.split("\n").toSorted());
	expect(backlog).toContain("# 9 open P1/P2 items");
});

test.each([
	[claudetto, "frozen-tests-conflict", " 2 pass\n 1 fail\n"],
	[claudetto, "stash-cleanup", " 1 pass\n 1 fail\n"],
	[spec, "contradiction-impossible", " 4 pass\n 1 fail\n"],
	[spec, "spec-edit-skill", " 4 pass\n 0 fail\n"],
	[spec, "spec-review-hollow-test", " 6 pass\n 1 todo\n 0 fail\n"],
	[spec, "specify-discount", " 2 pass\n 1 todo\n 0 fail\n"]
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
