// Writes `plugins/<plugin>/.claude-plugin/plugin.json` from `plugin.ts` and the `userConfig` of each slice (design, "Generated tree").
// The version comes from `package.json`, which `just bump` changes, so `plugin.ts` has no version.
// A plugin with `src/plugins/<plugin>/types/index.d.ts` names it as `types`, the contract that declares its `$.state` keys.

import fs from "node:fs";
import path from "node:path";
import type { UserConfigOption } from "../../../src/kernel/slice.ts";
import type { FoundPlugin } from "../discover.ts";
import type { Output } from "./texts.ts";

/** The manifest data of one plugin, which its `src/plugins/<plugin>/plugin.ts` exports as `plugin`. */
export interface PluginManifest {
  /** The name of the plugin folder. */
  readonly name: string;
  readonly description: string;
  readonly keywords?: readonly string[];
  readonly homepage?: string;
}

const SCHEMA = "https://www.schemastore.org/claude-code-plugin-manifest.json";
const AUTHOR = { name: "xsyetopz" };
const REPOSITORY = "https://github.com/xsyetopz/dotclaude";
/** The contract of a plugin, relative to the plugin folder. The text step copies it from `src/plugins/<plugin>/`. */
const TYPES = "./types/index.d.ts";

/** The column bound of the JSON formatter of Biome, which `just lint` runs on `plugins/`. */
const WIDTH = 80;

/** `json` as Biome formats it: two-space indents, and an array of scalars on one line when the line fits. */
export const formatJson = (json: unknown): string =>
  `${JSON.stringify(json, null, 2).replace(
    /^( *)("[^"]+": )\[\n((?: *(?:"(?:[^"\\]|\\.)*"|-?[\d.]+|true|false|null),?\n)+) *\]/gm,
    (all, indent: string, key: string, body: string) => {
      const items = body.split("\n").map((l) => l.trim().replace(/,$/, ""));
      const line = `${indent}${key}[${items.filter(Boolean).join(", ")}]`;
      return line.length <= WIDTH ? line : all;
    },
  )}\n`;

/** The `userConfig` of the slices of `p`. It throws on two slices with one field. */
const userConfigOf = (
  p: FoundPlugin,
): Record<string, UserConfigOption> | undefined => {
  const out: Record<string, UserConfigOption> = {};
  for (const s of p.slices)
    for (const [key, option] of Object.entries(s.slice.userConfig ?? {})) {
      if (key in out)
        throw new Error(
          `${path.posix.join(s.dir, "slice.ts")}: another slice of ${p.name} has the userConfig field ${key}`,
        );
      out[key] = option;
    }
  return Object.keys(out).length ? out : undefined;
};

/** The generated `plugin.json` of the plugin `p`, or none when `p` has no `plugin.ts`. */
export const manifestOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Output[]> => {
  const config = userConfigOf(p);
  if (!p.manifest) {
    if (config)
      throw new Error(
        `src/plugins/${p.name}: a slice has a userConfig field, and plugin.json needs src/plugins/${p.name}/plugin.ts`,
      );
    return [];
  }
  const { version } = (await Bun.file(
    path.join(root, "package.json"),
  ).json()) as { version: string };
  const { description, keywords, homepage } = p.manifest;
  const types = fs.existsSync(path.join(root, "src/plugins", p.name, TYPES));
  const json = {
    $schema: SCHEMA,
    name: p.name,
    version,
    description,
    author: AUTHOR,
    repository: REPOSITORY,
    license: "MIT",
    ...(config ? { userConfig: config } : {}),
    ...(homepage ? { homepage } : {}),
    ...(keywords ? { keywords } : {}),
    ...(types ? { types: TYPES } : {}),
  };
  return [
    {
      file: `plugins/${p.name}/.claude-plugin/plugin.json`,
      source: `src/plugins/${p.name}/plugin.ts`,
      text: formatJson(json),
    },
  ];
};
