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

/** True when the absolute path `file` is a prompt module that a `prompts/` folder next to it gives. */
export const isPromptModule = (file: string): boolean =>
  path.basename(file) === "prompts.ts" &&
  !fs.existsSync(file) &&
  fs.existsSync(path.join(path.dirname(file), "prompts"));

/**
 * For each character of `text`, true when it is code, and false when it is in a comment, a string, or the text part of a template.
 * A `${` of a template starts code again, up to its closing brace.
 * A regular expression literal that holds a quote is not known, so it can end the scan early.
 */
const codeMask = (text: string): boolean[] => {
  const mask: boolean[] = new Array(text.length).fill(false);
  // Each open template has the brace depth of its `${`, and the depth of the code around it is the last entry.
  const braces: number[] = [];
  let depth = 0;
  const skipTemplate = (from: number): number => {
    let i = from;
    while (i < text.length && text[i] !== "`") {
      if (text[i] === "\\") i++;
      else if (text[i] === "$" && text[i + 1] === "{") {
        braces.push(depth);
        depth = 0;
        return i + 2;
      }
      i++;
    }
    return i + 1;
  };
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
    } else if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (c === '"' || c === "'") {
      i++;
      while (i < text.length && text[i] !== c && text[i] !== "\n")
        i += text[i] === "\\" ? 2 : 1;
      i++;
    } else if (c === "`") {
      i = skipTemplate(i + 1);
    } else if (c === "}" && braces.length && depth === 0) {
      depth = braces.pop() as number;
      i = skipTemplate(i + 1);
    } else {
      if (c === "{") depth++;
      else if (c === "}") depth--;
      mask[i++] = true;
    }
  }
  return mask;
};

/** The import matches of `text` that are code, not text of a string, a template, or a comment. */
const importMatches = (text: string): RegExpMatchArray[] => {
  const mask = codeMask(text);
  return [...text.matchAll(IMPORT)].filter((m) => mask[m.index as number]);
};

/** The absolute paths of the files that the relative imports of the file `file` name. */
export const importsOf = (file: string, text: string): string[] =>
  importMatches(text).map((m) =>
    path.resolve(path.dirname(file), m[3] as string),
  );

/**
 * The paths, relative to `src/kernel/`, of each kernel module that the files `files` import, directly or through another kernel module.
 * It throws on a kernel module that does not exist, or that imports a file outside `src/kernel/`.
 * A prompt module of a `prompts/` folder of `src/kernel/` counts as a kernel module.
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
    // The text step writes a prompt module from its `prompts/` folder, and the module imports nothing.
    if (isPromptModule(target)) {
      found.add(target);
      return;
    }
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
 * The path of the copy of the file `file` of the slice folder `slice` in the plugin `plugin`, all paths absolute.
 * A hook lab test in `lab/` goes to `tests/` of the plugin, and each other file goes to `slices/<s>/`.
 */
const placeOf = (
  root: string,
  plugin: string,
  slice: string,
  file: string,
): string => {
  const [top, ...rest] = posix(path.relative(slice, file)).split("/");
  return top === "lab"
    ? path.join(root, "plugins", plugin, "tests", ...rest)
    : path.join(
        root,
        "plugins",
        plugin,
        "slices",
        path.basename(slice),
        top as string,
        ...rest,
      );
};

/**
 * The text `text` of the slice file `from`, for its copy at `to` in the plugin `plugin`, all paths absolute.
 * Each import of `src/kernel/` names the copy in `plugins/<plugin>/kernel/`, and each import of the slice folder names the copy of that file, so a hook lab test can import the slice.
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
  const replace = (lead: string, q: string, spec: string): string => {
    const target = path.resolve(path.dirname(from), spec);
    const own = inside(slice, target);
    if (!own && !inside(kernel, target))
      throw new Error(
        `${posix(path.relative(root, from))}: a slice imports only src/kernel/ and its own folder, and it imports ${posix(path.relative(root, target))}`,
      );
    const moved = posix(
      path.relative(
        path.dirname(to),
        own
          ? placeOf(root, plugin, slice, target)
          : path.join(copy, path.relative(kernel, target)),
      ),
    );
    return `${lead}${q}${moved.startsWith(".") ? moved : `./${moved}`}${q}`;
  };
  let out = "";
  let at = 0;
  for (const m of importMatches(text)) {
    const [all, lead, q, spec] = m as unknown as [
      string,
      string,
      string,
      string,
    ];
    out += text.slice(at, m.index) + replace(lead, q, spec);
    at = (m.index as number) + all.length;
  }
  return out + text.slice(at);
};
