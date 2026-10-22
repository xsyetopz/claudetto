// The merge of the settings snippet (`SNIPPET` of `prompts.ts`) into a settings object.
// `claudetto-setup` writes the result.

import { SNIPPET as WIKI_SNIPPET } from "../prompts.ts";

export type Json = Record<string, unknown>;

export const isObject = (v: unknown): v is Json =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const STATUS_LINES = ["statusLine", "subagentStatusLine"];

const LAUNCHER = "claudetto-statusline";

/**
 * The snippet, with no `$schema` (it names the schema of the wiki block, and is not a setting),
 * the text `<plugin folder>` replaced by `root`, and no status line key that `skipStatusLines` drops
 * or that `current` already sets to the command of another tool.
 */
export const snippetFor = (
  current: Json,
  root: string,
  skipStatusLines: boolean,
): { snippet: Json; kept: string[] } => {
  const { $schema: _schema, ...settings } = WIKI_SNIPPET as Json;
  const filled = JSON.parse(
    JSON.stringify(settings).replaceAll("<plugin folder>", root),
  ) as Json;
  const kept = STATUS_LINES.filter((key) => {
    const command = (current[key] as Json | undefined)?.["command"];
    return typeof command === "string" && !command.includes(LAUNCHER);
  });
  const drop = skipStatusLines ? STATUS_LINES : kept;
  return {
    snippet: Object.fromEntries(
      Object.entries(filled).filter(([key]) => !drop.includes(key)),
    ),
    kept: skipStatusLines ? [] : kept,
  };
};

const show = (v: unknown) => (v === undefined ? "(unset)" : JSON.stringify(v));

/** The value of `had` after the snippet value `value`: a list gains the missing entries, and a scalar is replaced. */
const nextValue = (had: unknown, value: unknown): unknown =>
  Array.isArray(value)
    ? [
        ...(Array.isArray(had) ? had : []),
        ...value.filter((v) => !(Array.isArray(had) && had.includes(v))),
      ]
    : value;

/**
 * `snippet` merged into `current`, with one line in `changes` for each key path that differs.
 * Objects merge key by key, arrays gain the missing entries, and scalars take the snippet value.
 * Keys of `current` that the snippet does not name stay.
 */
export const merge = (
  current: unknown,
  snippet: Json,
  changes: string[],
  at = "",
): Json => {
  const out: Json = isObject(current) ? { ...current } : {};
  for (const [key, value] of Object.entries(snippet)) {
    const where = at ? `${at}.${key}` : key;
    const had = out[key];
    if (isObject(value)) {
      out[key] = merge(had, value, changes, where);
      continue;
    }
    const next = nextValue(had, value);
    if (JSON.stringify(had) === JSON.stringify(next)) continue;
    changes.push(`${where}: ${show(had)} -> ${show(next)}`);
    out[key] = next;
  }
  return out;
};
