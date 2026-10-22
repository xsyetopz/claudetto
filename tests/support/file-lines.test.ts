// Each `.ts` and `.py` file of `plugins/`, `tools/`, and `tests/` has at most `MAX_FILE_LINES` lines (task 3.5 of change `0-3-0`, design D7).
// The test reads the tracked files and the new files that git does not ignore, so `node_modules` and the other ignored folders stay out.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { MAX_FILE_LINES } from "../../tools/limits.ts";
import { REPO } from "./repo.ts";

const FOLDERS = ["plugins", "tools", "tests"];

/** The files of `FOLDERS` that git tracks, or that are new and not ignored, and that still exist. */
const sourceFiles = (): string[] =>
  Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      ...FOLDERS,
    ],
    { cwd: REPO },
  )
    .stdout.toString()
    .split("\n")
    .filter((rel) => /\.(ts|py)$/.test(rel))
    .filter((rel) => fs.existsSync(path.join(REPO, rel)))
    .sort();

/** The number of lines of the text: a final newline does not start a line. */
const lineCount = (text: string): number =>
  text.endsWith("\n") ? text.split("\n").length - 1 : text.split("\n").length;

test("lint: no `.ts` or `.py` file has more lines than `MAX_FILE_LINES`", async () => {
  const long: string[] = [];
  for (const rel of sourceFiles()) {
    const lines = lineCount(await Bun.file(path.join(REPO, rel)).text());
    if (lines > MAX_FILE_LINES) long.push(`${rel}: ${lines} lines`);
  }
  expect(long).toEqual([]);
});

test("a final newline does not count as a line", () => {
  expect(lineCount("a\nb\n")).toBe(2);
  expect(lineCount("a\nb")).toBe(2);
});
