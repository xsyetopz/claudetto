// Fails while a table row of `findings.md` of an openspec change has no passed check (D38, `just release-check`).
// A row passes when its `Task` cell is `none`, or says `done` or `(checked)`.
// Any other row is open, and the tool prints its line number, surface, and task.
//
//   bun tools/findings-check.ts CHANGE|FILE.md    CHANGE is a change folder name and is required

import fs from "node:fs";
import path from "node:path";
import { REPO } from "./recipes.ts";

export type OpenRow = { line: number; surface: string; task: string };

const cells = (row: string): string[] =>
  row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

/** True when a `Task` cell shows a passed check: `none`, a task id with `done ...`, or `(checked)`. */
export const passed = (task: string): boolean =>
  task === "none" ||
  /^(\d+(\.\d+)*,\s*)+done\b/.test(task) ||
  task.includes("(checked)");

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
    if (taskColumn < 0 || row.every((cell) => /^:?-+:?$/.test(cell))) return;
    const task = row[taskColumn] ?? "";
    if (!passed(task))
      open.push({ line: index + 1, surface: row[0] ?? "", task });
  });
  return open;
};

if (import.meta.main) {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "Usage: bun tools/findings-check.ts CHANGE|FILE.md (CHANGE is a folder name under openspec/changes/)",
    );
    process.exit(2);
  }
  const file = arg.endsWith(".md")
    ? path.resolve(arg)
    : path.join(REPO, "openspec/changes", arg, "findings.md");
  if (!fs.existsSync(file)) {
    console.error(`No findings file: ${file}`);
    process.exit(1);
  }
  const open = openRows(await Bun.file(file).text());
  for (const { line, surface, task } of open)
    console.error(`findings.md:${line}: ${surface} (task: ${task})`);
  if (open.length) {
    console.error(`${open.length} open row(s) in ${file}.`);
    process.exit(1);
  }
  console.log("Every row of findings.md has a passed check.");
}
