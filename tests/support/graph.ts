// The import graph of the files of `plugins/`: each static, re-export, dynamic, and side-effect import, and the path that a relative import reaches.
// The rules in `tests/repo/imports.test.ts` read the graph.

import fs from "node:fs";
import path from "node:path";
import { REPO } from "./repo.ts";

/** The source of each file, by its path under the repository. */
export type Files = Record<string, string>;

/** An import of a source: a static `spec`, or a dynamic one with a `spec` only when it is a literal. */
export type Import =
  | { spec: string; dynamic: false }
  | { spec: string | null; dynamic: true };

/** A static import of a file, with the path that a relative `spec` points to. */
export type Edge = { file: string; spec: string; target: string | null };

const posix = path.posix;

// Comments hold sample imports (a JSDoc type), so they are removed before the parse.
export const stripComments = (src: string): string =>
  src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Every import, re-export, and dynamic import of a source, as `{ spec, dynamic }`.
export const parseImports = (source: string): Import[] => {
  const src = stripComments(source);
  const found: Import[] = [];
  const from = /^[ \t]*(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']/gm;
  const bare = /^[ \t]*import\s*["']([^"']+)["']/gm;
  for (const re of [from, bare])
    for (const m of src.matchAll(re))
      found.push({ spec: m[1] as string, dynamic: false });
  for (const m of src.matchAll(/(?<![\w.$])import\s*\(\s*(["'])?([^"')]*)/g))
    found.push({ spec: m[1] ? (m[2] as string) : null, dynamic: true });
  return found;
};

// The plugin folder of a path: `plugins/<name>`.
const pluginOf = (file: string): string =>
  file.split("/").slice(0, 2).join("/");

// Where a relative import points, or `null` for a `node:` module or a bare package.
export const resolve = (file: string, spec: string): string | null =>
  spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;

// The static relative and package imports of each file, with the target path of a relative one.
export const edges = (files: Files): Edge[] => {
  const out: Edge[] = [];
  for (const [file, source] of Object.entries(files))
    for (const imp of parseImports(source))
      if (!imp.dynamic)
        out.push({ file, spec: imp.spec, target: resolve(file, imp.spec) });
  return out;
};

// True when `target` is a path under the plugin of `file`.
export const inside = (file: string, target: string): boolean =>
  target === pluginOf(file) || target.startsWith(`${pluginOf(file)}/`);

// The part of a path under its plugin: `slices/reads/slice.ts` gives `slices/reads/slice.ts`, under `plugins/claudetto/`.
export const within = (file: string): string[] => file.split("/").slice(2);

const isModuleEntry = (file: string): boolean =>
  /^plugins\/[^/]+\/hooks\/(register|module\/index)\.(?:mjs|ts)$/.test(file);

// The files of the graphs of the hooks modules: each entry, and each file that a static relative import reaches.
export const moduleGraph = (files: Files): Set<string> => {
  const seen = new Set<string>();
  const queue = Object.keys(files).filter(isModuleEntry);
  while (queue.length) {
    const file = queue.shift() as string;
    if (seen.has(file) || !(file in files)) continue;
    seen.add(file);
    for (const imp of parseImports(files[file] as string)) {
      const target = imp.dynamic ? null : resolve(file, imp.spec);
      if (target) queue.push(target);
    }
  }
  return seen;
};

// A `bin/` file of a plugin is an entry point with no file extension.
// The hook labs of `plugins/claudetto/tests/` run in `claude plugin test` and import its types, so they are out of scope.
const isScript = (rel: string): boolean =>
  (/\.(mjs|cjs|js|ts)$/.test(rel) &&
    !/\.d\.ts$/.test(rel) &&
    !rel.startsWith("plugins/claudetto/tests/")) ||
  /^plugins\/[^/]+\/bin\/[^/.]+$/.test(rel);

// The tracked and new script files of `folders`, with no git-ignored file and no folder without files.
export const repoFiles = async (
  folders: string[] = ["plugins"],
): Promise<Files> => {
  const ls = Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      ...folders,
    ],
    { cwd: REPO },
  );
  const files: Files = {};
  for (const rel of ls.stdout.toString().split("\n"))
    if (isScript(rel) && fs.existsSync(path.join(REPO, rel)))
      files[rel] = await Bun.file(path.join(REPO, rel)).text();
  return files;
};
