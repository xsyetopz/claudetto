// Computes the settings snippet of a plugin from the `settings` entries of its slices (workflow, "Settings snippet").
// No file is written here: the text step gives the snippet to the `{{include snippet.json}}` lines of the core plugin.
// The top-level keys follow the property order of `schemas/claude-code-settings.json`, and the keys of `env` are in alphabetical order.
// Each other key keeps the order in which the slices set it.
// A plugin whose slices have no `settings` entry has no snippet.

import path from "node:path";
import type { FoundPlugin } from "../discover.ts";
import { formatJson } from "./manifest.ts";

/** The plugin whose snippet the texts of `src/` include as `snippet.json`. */
const CORE = "claudetto";

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
    } else if (!Bun.deepEquals(out[key], value, true))
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

/** The settings snippet of the plugin `p` of `root`, or `null` when no slice of `p` has a `settings` entry. */
export const snippetOf = async (
  root: string,
  p: FoundPlugin,
): Promise<Json | null> => {
  if (!p.slices.some((s) => s.slice.settings)) return null;
  const merged: Json = {};
  const owners = new Map<string, string>();
  for (const s of p.slices)
    if (s.slice.settings)
      addAll(merged, owners, s.slice.settings as Json, s.name, "");
  return inOrder(root, merged);
};

/**
 * The include parts of the text step: `snippet.json` is the text of the snippet of the core plugin.
 * Each plugin's snippet is computed, so a clash between two slices of any plugin is an error.
 */
export const snippetParts = async (
  root: string,
  plugins: readonly FoundPlugin[],
): Promise<Record<string, string>> => {
  const parts: Record<string, string> = {};
  for (const p of plugins) {
    const snippet = await snippetOf(root, p);
    if (snippet && p.name === CORE) parts["snippet.json"] = formatJson(snippet);
  }
  return parts;
};
