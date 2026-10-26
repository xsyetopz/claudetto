// The memory files of `claudetto-setup`: the global `~/.claude/CLAUDE.md`, the `CLAUDE.md` files that a project can exclude, and `CLAUDE.local.md` (design D21).
import fs from "node:fs";
import path from "node:path";
import { fileReader, writeAtomic } from "../../../kernel/node/fs.ts";
import {
  lineCount,
  type MemoryFile,
  TESTS_RULE,
  withClaudeMdBlock,
} from "../domain/claude-md.ts";
import { withLocalNotes } from "../domain/gitignore.ts";
import { GLOBAL_CLAUDE_MD_MAX_LINES, VENDOR_DIRS } from "../limits.ts";
import { LOCAL_NOTES_TEMPLATE, TESTS_RULE_TEMPLATE, t } from "../prompts.ts";
import { amend } from "./scan.ts";

type Io = { log: (line: string) => void; error: (line: string) => void };

/**
 * Writes the global file `CLAUDE.md` of `configDir` with the origin block, and the `rules` of the user when the file is new. Nothing is written without `apply`, or when the file would pass `GLOBAL_CLAUDE_MD_MAX_LINES`.
 * With `apply`, it also writes `rules/claudetto-tests.md` when the file is not there.
 */
export const writeClaudeMd = async (
  io: Io,
  configDir: string,
  rules: string[],
  apply: boolean,
): Promise<number> => {
  const file = path.join(configDir, "CLAUDE.md");
  const text = (await fileReader.read(file)) ?? "";
  const next = withClaudeMdBlock(text, rules);
  const lines = lineCount(next);
  if (next === text) io.log(t("mdMatch", { file }));
  else if (lines > GLOBAL_CLAUDE_MD_MAX_LINES) {
    io.error(t("mdOver", { file, lines, max: GLOBAL_CLAUDE_MD_MAX_LINES }));
    return 1;
  } else if (!apply) io.log(t("dryRun"));
  else {
    fs.mkdirSync(configDir, { recursive: true });
    await writeAtomic(file, next);
    io.log(t("mdWrote", { file }));
  }
  const rule = path.join(configDir, "rules", TESTS_RULE);
  if (apply && (await fileReader.read(rule)) === null) {
    fs.mkdirSync(path.dirname(rule), { recursive: true });
    await writeAtomic(rule, TESTS_RULE_TEMPLATE);
    io.log(t("mdWrote", { file: rule }));
  }
  return 0;
};

/** Writes the template `CLAUDE.local.md` in `projectDir` when it is not there, and, in a project with `.git/`, its line in `.gitignore`. */
export const writeLocalNotes = async (
  io: Io,
  projectDir: string,
  apply: boolean,
): Promise<number> => {
  if (!apply) io.log(t("dryRun"));
  else {
    const file = path.join(projectDir, "CLAUDE.local.md");
    if ((await fileReader.read(file)) === null)
      await writeAtomic(file, LOCAL_NOTES_TEMPLATE);
    if (fs.existsSync(path.join(projectDir, ".git")))
      await amend(path.join(projectDir, ".gitignore"), withLocalNotes);
    io.log(t("notesWrote", { file }));
  }
  return 0;
};

/**
 * The `CLAUDE.md` files that Claude Code can load from outside the project `projectDir`, each with the glob that excludes it:
 * the files of each parent folder, and the files of the packages in `VENDOR_DIRS`, with `excludes` (the `claudeMdExcludes` of the settings) marked.
 * The global file of `configDir` is not one of them.
 */
export const findMemoryFiles = async (
  projectDir: string,
  configDir: string,
  excludes: unknown,
): Promise<MemoryFile[]> => {
  const listed = Array.isArray(excludes) ? excludes : [];
  const found: Omit<MemoryFile, "excluded">[] = [];
  const global = path.join(configDir, "CLAUDE.md");
  for (let dir = projectDir; path.dirname(dir) !== dir; ) {
    dir = path.dirname(dir);
    for (const rel of ["CLAUDE.md", "CLAUDE.local.md", ".claude/CLAUDE.md"]) {
      const file = path.join(dir, rel);
      if (file !== global && (await fileReader.read(file)) !== null)
        found.push({ path: file, kind: "parent", glob: file });
    }
  }
  for (const vendor of VENDOR_DIRS) {
    const root = path.join(projectDir, vendor);
    const packages = await Promise.all(
      (await fileReader.list(root)).map(async (name) =>
        name.startsWith("@")
          ? (await fileReader.list(path.join(root, name))).map((n) =>
              path.join(name, n),
            )
          : [name],
      ),
    );
    for (const name of packages.flat().sort()) {
      const file = path.join(root, name, "CLAUDE.md");
      if ((await fileReader.read(file)) !== null)
        found.push({
          path: file,
          kind: "vendor",
          glob: path.join(root, "**", "CLAUDE.md"),
        });
    }
  }
  return found.map((f) => ({
    ...f,
    excluded: listed.includes(f.glob) || listed.includes(f.path),
  }));
};
