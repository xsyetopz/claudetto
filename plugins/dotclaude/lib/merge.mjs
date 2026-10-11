// The merge of the settings snippet (`lib/snippet.mjs`) into settings.
// `setup` writes the result, and the drift check reads only the change lines.
// This file is in the import graph of the hooks module, so it imports only `lib/`.

import { FABLE, MYTHOS, PLUGIN_FOLDER, SNIPPET } from "./snippet.mjs";

/** The arrays that take the entries of the snippet, and do not gain them. */
const REPLACED = new Set(["availableModels"]);

/** The status line keys of the snippet. */
const STATUS_LINES = ["statusLine", "subagentStatusLine"];

/**
 * True when `command` runs a status line of dotclaude: the script of a plugin folder,
 * or a launcher stub in `<config dir>/dotclaude/` of 0.26 or 0.27.0.
 *
 * @param {string} command
 */
export const isOurStatusLine = (command) =>
  /[\\/]features[\\/]statusline[\\/]/.test(command) ||
  /[\\/]dotclaude[\\/](?:statusline|subagent-statusline|subagents)\.mjs/.test(
    command,
  );

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
export const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);
/** @param {unknown} v */
const show = (v) => (v === undefined ? "(unset)" : JSON.stringify(v));

/**
 * `root` in one form on each platform: forward slashes, which Node and the shell of Claude Code take on Windows too.
 *
 * @param {string} root
 */
export const slashRoot = (root) => root.replaceAll("\\", "/");

/**
 * `value` with each `PLUGIN_FOLDER` in a string replaced by `root` in the form of `slashRoot`.
 *
 * @param {unknown} value
 * @param {string} root
 * @returns {any}
 */
export function fillPluginFolder(value, root) {
  if (typeof value === "string")
    return value.replaceAll(PLUGIN_FOLDER, slashRoot(root));
  if (Array.isArray(value)) return value.map((v) => fillPluginFolder(v, root));
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, fillPluginFolder(v, root)]),
  );
}

/**
 * `snippet` merged into `current`, and one change line for each key path that differs.
 * Objects merge key by key, arrays gain the missing entries, and scalars take the snippet value.
 * Keys of `current` that the snippet does not name stay.
 * A value of `current` that is not an object, where the snippet has an object, gets its own change line.
 *
 * @param {any} current
 * @param {Record<string, any>} snippet
 * @param {string} [keyPath]
 * @param {{ key: string, line: string }[]} [changes]
 * @returns {{ settings: Record<string, any>, changes: { key: string, line: string }[] }}
 */
export function mergeSettings(current, snippet, keyPath = "", changes = []) {
  /** @type {Record<string, any>} */
  const out = isObject(current) ? { ...current } : {};
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
 *
 * @param {Record<string, any>} snippet
 * @param {any} current
 * @param {boolean} mythos
 */
export function withMythos(snippet, current, mythos) {
  const models = snippet.availableModels;
  const keep =
    mythos ||
    (Array.isArray(current?.availableModels) &&
      current.availableModels.includes(MYTHOS));
  if (!keep || !Array.isArray(models)) return snippet;
  return {
    ...snippet,
    availableModels: models.map((m) => (m === FABLE ? MYTHOS : m)),
  };
}

/**
 * The status line keys of `current` whose command runs another tool.
 * Setup keeps them, and the drift check does not report them.
 *
 * @param {any} current
 */
export const foreignStatusLines = (current) =>
  STATUS_LINES.filter((key) => {
    const command = current?.[key]?.command;
    return typeof command === "string" && !isOurStatusLine(command);
  });

/**
 * The snippet for `current`: `root` in the status line commands, the Mythos choice of `withMythos`,
 * and no status line key that `foreignStatusLines` names or that `skipStatusLines` drops.
 *
 * @param {any} current
 * @param {string} root
 * @param {boolean} [mythos]
 * @param {boolean} [skipStatusLines]
 */
export function snippetFor(
  current,
  root,
  mythos = false,
  skipStatusLines = false,
) {
  const drop = skipStatusLines ? STATUS_LINES : foreignStatusLines(current);
  const snippet = withMythos(fillPluginFolder(SNIPPET, root), current, mythos);
  return Object.fromEntries(
    Object.entries(snippet).filter(([key]) => !drop.includes(key)),
  );
}
