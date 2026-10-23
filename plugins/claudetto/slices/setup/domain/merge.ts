// The merge of the settings snippet (`SNIPPET` of `prompts.ts`) into a settings object.
import { DROPPED_DENY, SNIPPET, t } from "../prompts.ts";

export type Json = Record<string, unknown>;

export const isObject = (v: unknown): v is Json =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const STATUS_LINES = ["statusLine", "subagentStatusLine"];

/**
 * The snippet with no `$schema`, and no status line key that `skipStatusLines` drops
 * or that `current` already sets to the command of another tool.
 */
export const snippetFor = (
  current: Json,
  root: string,
  skipStatusLines: boolean,
): { snippet: Json; kept: string[] } => {
  const { $schema: _schema, ...rest } = SNIPPET as Json;
  const settings = JSON.parse(
    JSON.stringify(rest).replaceAll("<plugin folder>", root),
  ) as Json;
  const kept = STATUS_LINES.filter((key) => {
    const command = (current[key] as Json | undefined)?.["command"];
    return (
      typeof command === "string" && !command.includes("claudetto-statusline")
    );
  });
  const drop = skipStatusLines ? STATUS_LINES : kept;
  return {
    snippet: Object.fromEntries(
      Object.entries(settings).filter(([key]) => !drop.includes(key)),
    ),
    kept: skipStatusLines ? [] : kept,
  };
};

/** `settings` without the deny rules of `DROPPED_DENY`, with one line in `changes` for each. */
export const dropOldDeny = (settings: Json, changes: string[]): Json => {
  const perms = isObject(settings["permissions"])
    ? settings["permissions"]
    : {};
  const deny: unknown[] = Array.isArray(perms["deny"]) ? perms["deny"] : [];
  const gone = DROPPED_DENY.filter((rule) => deny.includes(rule));
  for (const entry of gone)
    changes.push(t("droppedEntry", { key: "permissions.deny", entry }));
  if (!gone.length) return settings;
  const kept = deny.filter((rule) => !gone.includes(String(rule)));
  return { ...settings, permissions: { ...perms, deny: kept } };
};

const show = (v: unknown) => (v === undefined ? "(unset)" : JSON.stringify(v));

/** A list gains the missing entries, compared as JSON, and a scalar is replaced. */
const nextValue = (had: unknown, value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  const list = Array.isArray(had) ? had : [];
  const have = new Set(list.map((v) => JSON.stringify(v)));
  return [...list, ...value.filter((v) => !have.has(JSON.stringify(v)))];
};

/**
 * `snippet` merged into `current`, with one line in `changes` for each key path that differs.
 * Objects merge key by key, arrays gain the missing entries, scalars take the snippet value, and the key paths of `keep` stay.
 */
export const merge = (
  current: unknown,
  snippet: Json,
  changes: string[],
  keep: readonly string[] = [],
  at = "",
): Json => {
  const out: Json = isObject(current) ? { ...current } : {};
  for (const [key, value] of Object.entries(snippet)) {
    const where = at ? `${at}.${key}` : key;
    const had = out[key];
    if (keep.includes(where)) continue;
    if (isObject(value)) {
      out[key] = merge(had, value, changes, keep, where);
      continue;
    }
    const next = nextValue(had, value);
    if (JSON.stringify(had) === JSON.stringify(next)) continue;
    changes.push(`${where}: ${show(had)} -> ${show(next)}`);
    out[key] = next;
  }
  return out;
};
