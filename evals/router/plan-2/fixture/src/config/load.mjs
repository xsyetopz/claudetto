import fs from "node:fs";
import { DEFAULTS } from "./defaults.mjs";
import { KEYS } from "./schema.mjs";

export function load(file) {
  const given = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [k, v] of Object.entries(given))
    if (typeof v !== KEYS[k]) throw new Error(`bad config key ${k}`);
  return { ...DEFAULTS, ...given };
}
