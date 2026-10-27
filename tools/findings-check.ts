// Fails while a table row of `findings.md` of an openspec change has no passed check (D38, `just release-check`).
// A row passes when its `Task` cell is `none`, or says `done` or `(checked)`.
// Any other row is open, and the tool prints its line number, surface, and task.
//
//   bun tools/findings-check.ts CHANGE|FILE.md    CHANGE is a change folder name and is required

import path from "node:path";
import { file as bunFile } from "bun";
import { REPO } from "./recipes.ts";

export interface OpenRow {
	line: number;
	surface: string;
	task: string;
}

// A table cell of the `---` divider row.
const DIVIDER_CELL = /^:?-+:?$/;
// A `Task` cell that names task ids with `done`.
const DONE_CELL = /^(\d+(\.\d+)*,\s*)+done\b/;

const cells = (row: string): string[] =>
	row
		.split("|")
		.slice(1, -1)
		.map((cell) => cell.trim());

/** True when a `Task` cell shows a passed check: `none`, a task id with `done ...`, or `(checked)`. */
export const passed = (task: string): boolean =>
	task === "none" || DONE_CELL.test(task) || task.includes("(checked)");

/** The rows of the tables of `markdown` whose `Task` cell is not a passed check. */
export const openRows = (markdown: string): OpenRow[] => {
	const open: OpenRow[] = [];
	let taskColumn = -1;
	markdown.split("\n").forEach((text, index) => {
		const row = cells(text);
		if (!text.startsWith("|") || row.includes("Task")) {
			taskColumn = text.startsWith("|") ? row.indexOf("Task") : -1;
			return;
		}
		if (taskColumn < 0 || row.every((cell) => DIVIDER_CELL.test(cell))) {
			return;
		}
		const task = row[taskColumn] ?? "";
		if (!passed(task)) {
			open.push({ line: index + 1, surface: row[0] ?? "", task });
		}
	});
	return open;
};

/** Checks the findings file that `arg` names, and returns the exit status. */
const run = async (arg: string | undefined): Promise<number> => {
	if (!arg) {
		console.error(
			"Usage: bun tools/findings-check.ts CHANGE|FILE.md (CHANGE is a folder name under openspec/changes/)",
		);
		return 2;
	}
	const file = arg.endsWith(".md")
		? path.resolve(arg)
		: path.join(REPO, "openspec/changes", arg, "findings.md");
	if (!(await bunFile(file).exists())) {
		console.error(`No findings file: ${file}`);
		return 1;
	}
	const open = openRows(await bunFile(file).text());
	for (const { line, surface, task } of open) {
		console.error(`findings.md:${line}: ${surface} (task: ${task})`);
	}
	if (open.length > 0) {
		console.error(`${open.length} open row(s) in ${file}.`);
		return 1;
	}
	process.stdout.write("Every row of findings.md has a passed check.\n");
	return 0;
};

if (import.meta.main) {
	process.exitCode = await run(process.argv[2]);
}
