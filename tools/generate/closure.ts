// The kernel closure of a plugin (design, "Generated tree"):
// each add-on gets its own copy of the `src/kernel/` modules that it imports, in `plugins/<plugin>/kernel/`.
// The copy of a slice file gets each `src/kernel/` import path changed to that folder.
// A slice imports only `src/kernel/` and its own folder, and a kernel module imports only `src/kernel/`.

import fs from "node:fs";
import path from "node:path";

/** A relative module path after `from`, after `import(`, or after a bare `import`. */
const IMPORT =
  /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;

/** `p` in the `/` form of the repository paths. */
const posix = (p: string): string => p.split(path.sep).join(path.posix.sep);

/** True when the absolute path `file` is in the folder `dir`. */
const inside = (dir: string, file: string): boolean =>
  !path.relative(dir, file).startsWith("..");

/** The absolute paths of the files that the relative imports of the file `file` name. */
export const importsOf = (file: string, text: string): string[] =>
  [...text.matchAll(IMPORT)].map((m) =>
    path.resolve(path.dirname(file), m[3] as string),
  );

/**
 * The paths, relative to `src/kernel/`, of each kernel module that the files `files` import, directly or through another kernel module.
 * It throws on a kernel module that does not exist, or that imports a file outside `src/kernel/`.
 */
export const kernelClosure = async (
  root: string,
  files: readonly string[],
): Promise<string[]> => {
  const kernel = path.join(root, "src", "kernel");
  const found = new Set<string>();
  const queue: string[] = [];
  const add = (from: string, target: string) => {
    if (!inside(kernel, target) || found.has(target)) return;
    if (!fs.existsSync(target))
      throw new Error(
        `${posix(path.relative(root, from))}: the kernel module ${posix(path.relative(root, target))} does not exist`,
      );
    found.add(target);
    queue.push(target);
  };
  for (const file of files)
    for (const t of importsOf(file, await Bun.file(file).text())) add(file, t);
  for (let at = queue.shift(); at; at = queue.shift())
    for (const t of importsOf(at, await Bun.file(at).text())) {
      if (!inside(kernel, t))
        throw new Error(
          `${posix(path.relative(root, at))}: a kernel module imports only src/kernel/, and it imports ${posix(path.relative(root, t))}`,
        );
      add(at, t);
    }
  return [...found].map((f) => posix(path.relative(kernel, f))).sort();
};

/**
 * The text `text` of the slice file `from`, for its copy at `to` in the plugin `plugin`, all paths absolute.
 * Each import of `src/kernel/` names the copy in `plugins/<plugin>/kernel/`.
 * It throws on an import of a file outside `src/kernel/` and outside the slice folder `slice`.
 */
export const rewrite = (
  root: string,
  plugin: string,
  slice: string,
  from: string,
  to: string,
  text: string,
): string => {
  const kernel = path.join(root, "src", "kernel");
  const copy = path.join(root, "plugins", plugin, "kernel");
  return text.replace(IMPORT, (all, lead: string, q: string, spec: string) => {
    const target = path.resolve(path.dirname(from), spec);
    if (inside(slice, target)) return all;
    if (!inside(kernel, target))
      throw new Error(
        `${posix(path.relative(root, from))}: a slice imports only src/kernel/ and its own folder, and it imports ${posix(path.relative(root, target))}`,
      );
    const moved = posix(
      path.relative(
        path.dirname(to),
        path.join(copy, path.relative(kernel, target)),
      ),
    );
    return `${lead}${q}${moved.startsWith(".") ? moved : `./${moved}`}${q}`;
  });
};
