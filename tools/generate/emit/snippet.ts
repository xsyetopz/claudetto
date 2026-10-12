// Writes `plugins/<plugin>/settings-snippet.json` from the `settings` entries of the slices of the plugin (workflow, "Settings snippet").
// The top-level keys follow the property order of `schemas/claude-code-settings.json`, and the keys of `env` are in alphabetical order.
// Each other key keeps the order in which the slices set it.
// A plugin whose slices have no `settings` entry gives no file.

import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { FoundPlugin } from "../discover.ts";
import { formatJson } from "./manifest.ts";
import type { Output } from "./texts.ts";

/** The schema whose top-level properties give the order of the keys of the snippet. */
const SCHEMA = "schemas/claude-code-settings.json";

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Adds the settings `add` of the slice `slice` to `out`, at the dotted path `at`.
 * `owners` maps each dotted path to the slice that set it first.
 * It throws when two slices set one path to different values.
 */
const addAll = (
  out: Json,
  owners: Map<string, string>,
  add: Json,
  slice: string,
  at: string,
): void => {
  for (const [key, value] of Object.entries(add)) {
    const where = at ? `${at}.${key}` : key;
    if (isObject(value) && (!(key in out) || isObject(out[key]))) {
      if (!(key in out)) {
        out[key] = {};
        owners.set(where, slice);
      }
      addAll(out[key] as Json, owners, value, slice, where);
    } else if (!(key in out)) {
      out[key] = structuredClone(value);
      owners.set(where, slice);
    } else if (!isDeepStrictEqual(out[key], value))
      throw new Error(
        `\`${where}\`: slices ${owners.get(where)} and ${slice} set it to different values. Set it in one slice only.`,
      );
  }
};

/** The keys of `obj` that `first` names, in the order of `first`, then the other keys in their own order. */
const orderedBy = (obj: Json, first: readonly string[]): Json => {
  const rank = new Map(first.map((k, i) => [k, i]));
  const keys = Object.keys(obj).sort(
    (a, b) => (rank.get(a) ?? first.length) - (rank.get(b) ?? first.length),
  );
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
};

/** The merged settings `merged` with the keys in the order of the schema of `root`, and the keys of `env` sorted. */
const inOrder = async (root: string, merged: Json): Promise<Json> => {
  const schema = (await Bun.file(path.join(root, SCHEMA)).json()) as {
    properties?: Json;
  };
  const out = orderedBy(merged, Object.keys(schema.properties ?? {}));
  const env = out["env"];
  if (isObject(env)) out["env"] = orderedBy(env, Object.keys(env).sort());
  return out;
};

/** The settings snippet of the plugin `p` of `root`, or none when no slice of `p` has a `settings` entry. */
export const snippetOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Output[]> => {
  if (!p.slices.some((s) => s.slice.settings)) return [];
  const merged: Json = {};
  const owners = new Map<string, string>();
  for (const s of p.slices)
    if (s.slice.settings)
      addAll(merged, owners, s.slice.settings as Json, s.name, "");
  return [
    {
      file: `plugins/${p.name}/settings-snippet.json`,
      source: `src/plugins/${p.name}/slices/`,
      text: formatJson(await inOrder(root, merged)),
    },
  ];
};
