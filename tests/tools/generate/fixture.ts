// A repository root for the tests of the slice step of `tools/generate/`:
// a copy of `fixture/` in a new temporary folder, with a `package.json` and a git repository.
// The git repository lets the rebuild-list check list the files of `plugins/`.

import fs from "node:fs";
import path from "node:path";
import type { Output } from "../../../tools/generate/emit/texts.ts";
import { tmpDir } from "../../support/repo.ts";

export const FIXTURE = path.join(import.meta.dir, "fixture");

/** The version in the `package.json` of each fixture root. */
export const VERSION = "9.9.9";

/** A new copy of `fixture/` with the files `files`, by path relative to the root. */
export const fixtureRoot = async (
  files: Record<string, string> = {},
): Promise<string> => {
  const dir = tmpDir("generate-slices");
  fs.cpSync(FIXTURE, dir, { recursive: true });
  await Bun.write(
    path.join(dir, "package.json"),
    JSON.stringify({ version: VERSION }),
  );
  for (const [rel, text] of Object.entries(files))
    await Bun.write(path.join(dir, ...rel.split("/")), text);
  const git = Bun.spawnSync(["git", "init", "--quiet"], { cwd: dir });
  if (git.exitCode !== 0) throw new Error(`git init failed in ${dir}`);
  return dir;
};

/** Writes each file of `made` in `dir`, as `just generate` does. */
export const write = async (dir: string, made: Output[]): Promise<void> => {
  for (const o of made)
    await Bun.write(path.join(dir, ...o.file.split("/")), o.text);
};

/** The text of the output `file` of `made`. It throws when `made` has no such file. */
export const textOf = (made: Output[], file: string): string => {
  const o = made.find((m) => m.file === file);
  if (!o) throw new Error(`no output ${file}`);
  return o.text;
};
