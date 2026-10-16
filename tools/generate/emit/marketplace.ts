// Writes `.claude-plugin/marketplace.json` from `src/marketplace.ts` and the `plugin.ts` of each listed plugin.
// The version comes from `package.json`, which `just bump` changes.

import fs from "node:fs";
import path from "node:path";
import type { marketplace as Data } from "../../../src/marketplace.ts";
import type { FoundPlugin } from "../discover.ts";
import { formatJson } from "./manifest.ts";
import type { Output } from "./texts.ts";

const SCHEMA = "https://www.schemastore.org/claude-code-marketplace.json";

/** The generated marketplace file, or none when `root` has no `src/marketplace.ts`. It throws when the list and the plugins with a `plugin.ts` differ. */
export const marketplaceOf = async (
  root: string,
  plugins: readonly FoundPlugin[],
): Promise<Output[]> => {
  const file = path.join(root, "src", "marketplace.ts");
  if (!fs.existsSync(file)) return [];
  const { marketplace } = (await import(file)) as {
    marketplace: typeof Data;
  };
  const listed: readonly string[] = marketplace.plugins;
  const found = plugins.filter((p) => p.manifest);
  const unlisted = found.filter((p) => !listed.includes(p.name));
  const absent = listed.filter((n) => !found.some((p) => p.name === n));
  if (
    unlisted.length ||
    absent.length ||
    new Set(listed).size !== listed.length
  )
    throw new Error(
      `src/marketplace.ts: list each plugin of src/plugins/ with a plugin.ts once` +
        (unlisted.length
          ? `, add ${unlisted.map((p) => p.name).join(", ")}`
          : "") +
        (absent.length ? `, remove ${absent.join(", ")}` : ""),
    );
  const { version } = (await Bun.file(
    path.join(root, "package.json"),
  ).json()) as { version: string };
  const json = {
    $schema: SCHEMA,
    name: marketplace.name,
    owner: marketplace.owner,
    description: marketplace.description,
    metadata: { version },
    plugins: listed.map((name) => ({
      name,
      source: `./plugins/${name}`,
      description: found.find((p) => p.name === name)?.manifest?.description,
      category: marketplace.category,
    })),
  };
  return [
    {
      file: ".claude-plugin/marketplace.json",
      source: "src/marketplace.ts",
      text: formatJson(json),
    },
  ];
};
