// The merge of the settings snippet (`lib/snippet.ts`) into settings.
// `setup` writes the result, and the drift check reads only the change lines.
// This file is in the import graph of the hooks module, so it imports only `lib/`.

import { FABLE, MYTHOS, PLUGIN_FOLDER, SNIPPET } from "./snippet.ts";

/** One change line of a merge, and the key path that it names. */
type Change = { key: string; line: string };

/** A parsed JSON object, such as a settings file or the snippet. */
export type Json = Record<string, unknown>;

/** The arrays that take the entries of the snippet, and do not gain them. */
const REPLACED = new Set(["availableModels"]);

/** The status line keys of the snippet. */
const STATUS_LINES = ["statusLine", "subagentStatusLine"];

/**
 * True when `command` runs a status line of dotclaude: the script of a plugin folder,
 * or a launcher stub in `<config dir>/dotclaude/` of 0.26 or 0.27.0.
 */
export const isOurStatusLine = (command: string): boolean =>
  /[\\/]features[\\/]statusline[\\/]/.test(command) ||
  /[\\/]dotclaude[\\/](?:statusline|subagent-statusline|subagents)\.mjs/.test(
    command,
  );

export const isObject = (v: unknown): v is Json =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** The `command` of the object at `key` of `settings`, or undefined. */
export const commandOf = (settings: unknown, key: string): unknown => {
  const entry = isObject(settings) ? settings[key] : undefined;
  return isObject(entry) ? entry["command"] : undefined;
};

const show = (v: unknown) => (v === undefined ? "(unset)" : JSON.stringify(v));

/**
 * `root` in one form on each platform: forward slashes, which Node and the shell of Claude Code take on Windows too.
 */
export const slashRoot = (root: string): string => root.replaceAll("\\", "/");

/**
 * `value` with each `PLUGIN_FOLDER` in a string replaced by `root` in the form of `slashRoot`.
 */
export function fillPluginFolder<T>(value: T, root: string): T {
  if (typeof value === "string")
    return value.replaceAll(PLUGIN_FOLDER, slashRoot(root)) as T;
  if (Array.isArray(value))
    return value.map((v: unknown) => fillPluginFolder(v, root)) as T;
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, fillPluginFolder(v, root)]),
  ) as T;
}

/**
 * `snippet` merged into `current`, and one change line for each key path that differs.
 * Objects merge key by key, arrays gain the missing entries, and scalars take the snippet value.
 * Keys of `current` that the snippet does not name stay.
 * A value of `current` that is not an object, where the snippet has an object, gets its own change line.
 */
export function mergeSettings(
  current: unknown,
  snippet: Json,
  keyPath = "",
  changes: Change[] = [],
): { settings: Json; changes: Change[] } {
  const out: Json = isObject(current) ? { ...current } : {};
  for (const [key, value] of Object.entries(snippet)) {
    const where = keyPath ? `${keyPath}.${key}` : key;
    const existing = out[key];
    if (isObject(value)) {
      if (existing !== undefined && !isObject(existing))
        changes.push({
          key: where,
          line: `${where}: ${show(existing)} -> (an object)`,
        });
      out[key] = mergeSettings(existing, value, where, changes).settings;
    } else if (Array.isArray(value)) {
      const had = Array.isArray(existing) ? existing : [];
      const next = REPLACED.has(where)
        ? value
        : [...had, ...value.filter((v) => !had.includes(v))];
      if (JSON.stringify(had) !== JSON.stringify(next))
        changes.push({
          key: where,
          line: `${where}: ${show(existing)} -> ${show(next)}`,
        });
      out[key] = next;
    } else if (JSON.stringify(existing) !== JSON.stringify(value)) {
      changes.push({
        key: where,
        line: `${where}: ${show(existing)} -> ${show(value)}`,
      });
      out[key] = value;
    }
  }
  return { settings: out, changes };
}

/**
 * `snippet` with `MYTHOS` in place of `FABLE` in `availableModels`,
 * when `mythos` is true or `current` already lists `MYTHOS`.
 * The replace of `availableModels` then keeps the Mythos access of the user.
 */
export function withMythos(
  snippet: Json,
  current: unknown,
  mythos: boolean,
): Json {
  const models = snippet["availableModels"];
  const had = isObject(current) ? current["availableModels"] : undefined;
  const keep = mythos || (Array.isArray(had) && had.includes(MYTHOS));
  if (!keep || !Array.isArray(models)) return snippet;
  return {
    ...snippet,
    availableModels: models.map((m) => (m === FABLE ? MYTHOS : m)),
  };
}

/**
 * The status line keys of `current` whose command runs another tool.
 * Setup keeps them, and the drift check does not report them.
 */
export const foreignStatusLines = (current: unknown): string[] =>
  STATUS_LINES.filter((key) => {
    const command = commandOf(current, key);
    return typeof command === "string" && !isOurStatusLine(command);
  });

/**
 * The snippet for `current`: `root` in the status line commands, the Mythos choice of `withMythos`,
 * and no status line key that `foreignStatusLines` names or that `skipStatusLines` drops.
 */
export function snippetFor(
  current: unknown,
  root: string,
  mythos = false,
  skipStatusLines = false,
): Json {
  const drop = skipStatusLines ? STATUS_LINES : foreignStatusLines(current);
  const snippet = withMythos(fillPluginFolder(SNIPPET, root), current, mythos);
  return Object.fromEntries(
    Object.entries(snippet).filter(([key]) => !drop.includes(key)),
  );
}
