// The import rules of design D18 as pure functions from a map of path to source to a list of violations.
// `tests/dotclaude/imports.test.ts` runs them over the files of `plugins/`,
// and `tests/dotclaude/import-rules.test.ts` breaks each rule with a fixture.

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
type Edge = { file: string; spec: string; target: string | null };

const posix = path.posix;

// Comments hold sample imports (a JSDoc type), so they are removed before the parse.
const stripComments = (src: string): string =>
  src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Every import, re-export, and dynamic import of a source, as `{ spec, dynamic }`.
export function parseImports(source: string): Import[] {
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
}

// The plugin folder of a path: `plugins/<name>`.
const pluginOf = (file: string): string =>
  file.split("/").slice(0, 2).join("/");

// Where a relative import points, or `null` for a `node:` module or a bare package.
const resolve = (file: string, spec: string): string | null =>
  spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;

// The static relative and package imports of each file, with the target path of a relative one.
function edges(files: Files): Edge[] {
  const out: Edge[] = [];
  for (const [file, source] of Object.entries(files))
    for (const imp of parseImports(source))
      if (!imp.dynamic)
        out.push({ file, spec: imp.spec, target: resolve(file, imp.spec) });
  return out;
}

const inside = (file: string, target: string): boolean =>
  target === pluginOf(file) || target.startsWith(`${pluginOf(file)}/`);

// The part of a path under its plugin: `lib/budget.ts`, `features/reads/rules.ts`.
const within = (file: string): string[] => file.split("/").slice(2);

// Rule 1: `lib/` imports only `lib/` by relative path.
export function checkLib(files: Files): string[] {
  const bad: string[] = [];
  for (const { file, spec, target } of edges(files))
    if (within(file)[0] === "lib" && target && inside(file, target))
      if (within(target)[0] !== "lib")
        bad.push(`${file}: lib imports ${spec}, and lib imports only lib`);
  return bad;
}

// Rule 2: a feature file imports only `lib/` and its own feature folder.
export function checkFeatures(files: Files): string[] {
  const bad: string[] = [];
  for (const { file, spec, target } of edges(files)) {
    const [top, name] = within(file);
    if (top !== "features" || !target || !inside(file, target)) continue;
    const [tTop, tName] = within(target);
    if (tTop !== "lib" && !(tTop === "features" && tName === name))
      bad.push(
        `${file}: feature ${name} imports ${spec}, outside lib and itself`,
      );
  }
  return bad;
}

// The folders that an entry point imports.
// `slices/` and `kernel/` hold the 1.0.0 layout, and `hooks/legacy.ts` holds the 0.28.0 handlers that are not ported yet.
const ENTRY_TARGETS = new Set(["lib", "features", "slices", "kernel"]);

// Rule 3: entry points import `lib/`, features, slices, and `kernel/`, and a `cli` file only its own feature and `lib/`.
// The `noRestrictedImports` overrides of `biome.json` check the imports of `slices/` and `kernel/`, so this rule skips them.
export function checkEntries(files: Files): string[] {
  const bad: string[] = [];
  for (const { file, spec, target } of edges(files)) {
    const [top, name, leaf] = within(file);
    if (top === "lib" || top === "slices" || top === "kernel") continue;
    if (!target || !inside(file, target)) continue;
    const [tTop, tName] = within(target);
    if (top === "features") {
      if (!/^cli\.(?:mjs|ts)$/.test(leaf as string)) continue;
      if (tTop === "features" && tName !== name)
        bad.push(`${file}: cli imports ${spec}, another feature`);
    } else if (
      !ENTRY_TARGETS.has(tTop as string) &&
      within(target).join("/") !== "hooks/legacy.ts"
    )
      bad.push(
        `${file}: entry point imports ${spec}, outside lib, features, slices, and kernel`,
      );
  }
  return bad;
}

// Rule 4: no import leaves its plugin, so none reaches another plugin, `tools/`, or `tests/`.
export function checkPluginBoundary(files: Files): string[] {
  return edges(files)
    .filter(({ file, target }) => target && !inside(file, target))
    .map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);
}

// Rule 5: a plugin imports only relative paths and `node:` modules, never a package.
// A value import of "claude-code": an `import` that is not `import type`.
const CLAUDE_CODE_VALUE =
  /^[ \t]*import\s+(?!type\b)[^;]*?\bfrom\s*["']claude-code["']/m;

// A plugin imports only relative files, `node:` modules, and `bun:` modules.
// A type import of "claude-code" is allowed, because no import of it is left at run time.
export function checkNoPackages(files: Files): string[] {
  return edges(files)
    .filter(
      ({ file, spec }) =>
        !spec.startsWith(".") &&
        !spec.startsWith("node:") &&
        !spec.startsWith("bun:") &&
        !(
          spec === "claude-code" &&
          !CLAUDE_CODE_VALUE.test(files[file] as string)
        ),
    )
    .map(({ file, spec }) => `${file}: bare import ${spec}`);
}

const isModuleEntry = (file: string): boolean =>
  /^plugins\/[^/]+\/hooks\/(register|module\/index)\.(?:mjs|ts)$/.test(file);

// Rule 6: the graph of a hooks module has no `node:` import, no `import()`, and literal `on()` names.
// The mod runtime loads only relative files and "claude-code" in a hooks module, and it has no `Bun` global (`research/probes.md`, 2.16).
const MODULE_IMPORTS = new Set(["claude-code"]);

// The files of the graphs of the hooks modules: each entry, and each file that a static relative import reaches.
export function moduleGraph(files: Files): Set<string> {
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
}

export function checkModuleGraph(files: Files): string[] {
  const bad: string[] = [];
  for (const file of moduleGraph(files)) {
    const source = files[file] as string;
    for (const imp of parseImports(source)) {
      if (imp.dynamic) bad.push(`${file}: import() in the module graph`);
      else if (!resolve(file, imp.spec) && !MODULE_IMPORTS.has(imp.spec))
        bad.push(`${file}: ${imp.spec} in the module graph`);
    }
    const code = stripComments(source);
    if (/(?<![\w.$])Bun\b/.test(code))
      bad.push(`${file}: Bun global in the module graph`);
    for (const m of code.matchAll(/(?<![\w.$])on\(\s*(?!["'])/g))
      bad.push(
        `${file}: on() event name is not a string literal at ${m.index}`,
      );
  }
  return bad;
}

// A `bin/` file of a plugin is an entry point with no file extension.
// The hook-lab tests (`tests/*.test.ts`) run in `claude plugin test` and import its types, so they are out of scope.
const isScript = (rel: string): boolean =>
  (/\.(mjs|cjs|js|ts)$/.test(rel) &&
    !/\.d\.ts$/.test(rel) &&
    !/^plugins\/[^/]+\/tests\//.test(rel)) ||
  /^plugins\/[^/]+\/bin\/[^/.]+$/.test(rel);

// The tracked and new script files of `folders`, with no git-ignored file and no folder without files.
export async function repoFiles(
  folders: string[] = ["plugins"],
): Promise<Files> {
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
}

export const RULES = {
  checkLib,
  checkFeatures,
  checkEntries,
  checkPluginBoundary,
  checkNoPackages,
  checkModuleGraph,
};
