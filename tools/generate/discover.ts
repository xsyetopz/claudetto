// Finds each slice of the repository (design, "Generated tree"):
// each `src/plugins/<plugin>/slices/<s>/slice.ts`, so no list of slices exists to edit.
// It also reads the `plugin.ts` and the `description.md` of each plugin, and the `adapters/mod.ts` of each slice with mod handlers.

import fs from "node:fs";
import path from "node:path";
import type { Slice } from "../../src/kernel/slice.ts";
import type { PluginData, PluginManifest } from "./emit/manifest.ts";

/** One slice that the generator found. */
export interface FoundSlice {
  /** The name of the slice folder. */
  readonly name: string;
  /** The slice folder, relative to the root, with `/` separators. */
  readonly dir: string;
  readonly slice: Slice;
  /** The exports of `adapters/mod.ts`, empty when the slice has no mod handler. */
  readonly mod: Readonly<Record<string, unknown>>;
}

/** One plugin folder of `src/plugins/`, with its manifest data and its slices, sorted by name. */
export interface FoundPlugin {
  readonly name: string;
  readonly manifest?: PluginManifest;
  readonly slices: readonly FoundSlice[];
}

/** The sorted names of the folders in `dir`, or none when `dir` does not exist. */
const folders = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];

/** The slice in the folder `abs`, or `undefined` when the folder has no `slice.ts`. */
const readSlice = async (
  root: string,
  abs: string,
): Promise<FoundSlice | undefined> => {
  const file = path.join(abs, "slice.ts");
  if (!fs.existsSync(file)) return undefined;
  const dir = path.relative(root, abs).split(path.sep).join(path.posix.sep);
  const slice = (await import(file)).slice as Slice | undefined;
  const name = path.basename(abs);
  if (slice?.name !== name)
    throw new Error(
      `${path.posix.join(dir, "slice.ts")}: export a \`slice\` whose name is the folder name "${name}"`,
    );
  const modFile = path.join(abs, "adapters", "mod.ts");
  const mod = slice.mod?.length
    ? fs.existsSync(modFile)
      ? ((await import(modFile)) as Record<string, unknown>)
      : {}
    : {};
  return { name, dir, slice, mod };
};

/**
 * The text of `description.md` of the plugin `name` in `base`, with each line break as a space.
 * The file has one sentence on each line, and the manifest has the description on one line.
 */
const descriptionOf = async (base: string, name: string): Promise<string> => {
  const file = path.join(base, name, "description.md");
  if (!fs.existsSync(file))
    throw new Error(
      `src/plugins/${name}/description.md: write the description of the plugin in this file`,
    );
  return (await Bun.file(file).text())
    .trim()
    .split(/\s*\n\s*/)
    .join(" ");
};

/** Each plugin of `src/plugins/` of the repository `root` that has a `plugin.ts` or a slice. */
export const discover = async (root: string): Promise<FoundPlugin[]> => {
  const base = path.join(root, "src", "plugins");
  const found: FoundPlugin[] = [];
  for (const name of folders(base)) {
    const slices: FoundSlice[] = [];
    for (const s of folders(path.join(base, name, "slices"))) {
      const one = await readSlice(root, path.join(base, name, "slices", s));
      if (one) slices.push(one);
    }
    const file = path.join(base, name, "plugin.ts");
    const data = fs.existsSync(file)
      ? ((await import(file)).plugin as PluginData | undefined)
      : undefined;
    if (fs.existsSync(file) && data?.name !== name)
      throw new Error(
        `src/plugins/${name}/plugin.ts: export a \`plugin\` whose name is the folder name "${name}"`,
      );
    const manifest = data && {
      ...data,
      description: await descriptionOf(base, name),
    };
    if (manifest) found.push({ name, manifest, slices });
    else if (slices.length) found.push({ name, slices });
  }
  return found;
};
