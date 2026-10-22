// The import rules as pure functions from a map of path to source to a list of violations.
// `tests/claudetto/imports.test.ts` runs them over the files of `plugins/`,
// and `tests/claudetto/import-rules.test.ts` breaks each rule with a fixture.
// The rules of the design are in the "Imports" section of `wiki/claudetto/development/Plugin-Layout.md`, and the graph that they read is in `graph.ts`.

import fs from "node:fs";
import path from "node:path";
import {
  edges,
  type Files,
  inside,
  parseImports,
  resolve,
  stripComments,
  within,
} from "./graph.ts";
import { REPO } from "./repo.ts";

export type { Files };
export { parseImports };

// The folders that an entry point imports.
// `slices/` and `kernel/` hold the 1.0.0 layout.
const ENTRY_TARGETS = new Set(["lib", "features", "slices", "kernel"]);

// Rule 3: entry points import `lib/`, features, slices, and `kernel/`, and a `cli` file only its own feature and `lib/`.
// The `noRestrictedImports` overrides of `biome.json` check the imports of `slices/` and `kernel/`, so this rule skips them.
const entryFault = ({
  file,
  spec,
  target,
}: ReturnType<typeof edges>[number]): string | null => {
  const [top, name, leaf] = within(file);
  if (top === "lib" || top === "slices" || top === "kernel") return null;
  if (!target || !inside(file, target)) return null;
  const [tTop, tName] = within(target);
  if (top === "features") {
    if (!/^cli\.(?:mjs|ts)$/.test(leaf as string)) return null;
    return tTop === "features" && tName !== name
      ? `${file}: cli imports ${spec}, another feature`
      : null;
  }
  return ENTRY_TARGETS.has(tTop as string)
    ? null
    : `${file}: entry point imports ${spec}, outside lib, features, slices, and kernel`;
};

export const checkEntries = (files: Files): string[] =>
  edges(files)
    .map(entryFault)
    .filter((fault): fault is string => fault !== null);

// Rule 4: no import leaves its plugin, so none reaches another plugin, `tools/`, or `tests/`.
export const checkPluginBoundary = (files: Files): string[] =>
  edges(files)
    .filter(({ file, target }) => target && !inside(file, target))
    .map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);

// Rule 5: a plugin imports only relative paths and `node:` modules, never a package.
// A value import of "claude-code": an `import` that is not `import type`.
const CLAUDE_CODE_VALUE =
  /^[ \t]*import\s+(?!type\b)[^;]*?\bfrom\s*["']claude-code["']/m;

// A plugin imports only relative files, `node:` modules, and `bun:` modules.
// A type import of "claude-code" is allowed, because no import of it is left at run time.
export const checkNoPackages = (files: Files): string[] =>
  edges(files)
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

const isModuleEntry = (file: string): boolean =>
  /^plugins\/[^/]+\/hooks\/(register|module\/index)\.(?:mjs|ts)$/.test(file);

// Rule 6: the graph of a hooks module has no `node:` import, no `import()`, and literal `on()` names.
// The mod runtime loads only relative files and "claude-code" in a hooks module, and it has no `Bun` global (`research/probes.md`, 2.16).
const MODULE_IMPORTS = new Set(["claude-code"]);

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

// The faults of the imports of one file `file` in a module graph.
const moduleImportFaults = (file: string, source: string): string[] =>
  parseImports(source).flatMap((imp) => {
    if (imp.dynamic) return [`${file}: import() in the module graph`];
    if (!resolve(file, imp.spec) && !MODULE_IMPORTS.has(imp.spec))
      return [`${file}: ${imp.spec} in the module graph`];
    return [];
  });

// The faults of the code of one file `file` in a module graph: the `Bun` global and a computed `on()` name.
const moduleCodeFaults = (file: string, source: string): string[] => {
  const code = stripComments(source);
  const bad: string[] = [];
  if (/(?<![\w.$])Bun\b/.test(code))
    bad.push(`${file}: Bun global in the module graph`);
  for (const m of code.matchAll(/(?<![\w.$])on\((?!\s*["'])/g))
    bad.push(`${file}: on() event name is not a string literal at ${m.index}`);
  return bad;
};

export const checkModuleGraph = (files: Files): string[] =>
  [...moduleGraph(files)].flatMap((file) => {
    const source = files[file] as string;
    return [
      ...moduleImportFaults(file, source),
      ...moduleCodeFaults(file, source),
    ];
  });

// A `bin/` file of a plugin is an entry point with no file extension.
// The hook-lab tests (`tests/*.test.ts`) run in `claude plugin test` and import its types, so they are out of scope.
const isScript = (rel: string): boolean =>
  (/\.(mjs|cjs|js|ts)$/.test(rel) &&
    !/\.d\.ts$/.test(rel) &&
    !/^plugins\/[^/]+\/tests\//.test(rel)) ||
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

export const RULES = {
  checkEntries,
  checkPluginBoundary,
  checkNoPackages,
  checkModuleGraph,
};
