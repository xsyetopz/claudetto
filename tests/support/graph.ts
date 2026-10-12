// The import graph of the files of `plugins/`: each static, re-export, dynamic, and side-effect import, and the path that a relative import reaches.
// The rules in `import-rules.ts` and `lib-feature-imports.ts` read the graph.

import path from "node:path";

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

// The part of a path under its plugin: `slices/reads/slice.ts` gives `slices/reads/slice.ts`, under `plugins/dotclaude/`.
export const within = (file: string): string[] => file.split("/").slice(2);
