// The cleanup of the keys that claudetto 0.1.0 and 0.2.0 wrote to a settings file and to `CLAUDE.md`.
// Each function removes only what an old version wrote, and leaves the keys of the user,
// except `autoMode`, which does nothing when the snippet turns auto mode off.

import {
  DROPPED_AUTO_MODE,
  DROPPED_ENTRY,
  DROPPED_HOOK,
  DROPPED_KEY,
  LEGACY_KEYS,
  SNIPPET,
} from "../prompts.ts";
import OLD from "../snippet-0.2.0.json";
import { isObject, type Json } from "./merge.ts";

const BEGIN = "<!-- claudetto:begin -->";
const END = "<!-- claudetto:end -->";

const HOOK_PREFIX = "hook.claudetto-";

/** The keys that 0.1.0 set to `"true"` so that its hooks win over a repository that turns them off. */
const ENABLED_KEYS = ["hook.commit-msg.enabled", "hook.pre-push.enabled"];

/**
 * `settings` without the `GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>` pairs of the claudetto hooks.
 * The pairs of the user move to the first slots, and `GIT_CONFIG_COUNT` follows (the key goes when no pair is left).
 */
export const cleanGitConfig = (settings: Json): Json => {
  const env = isObject(settings["env"]) ? settings["env"] : {};
  const count = Number.parseInt(String(env["GIT_CONFIG_COUNT"]), 10);
  if (!(count > 0)) return settings;
  const pairs = Array.from({ length: count }, (_, i) => [
    env[`GIT_CONFIG_KEY_${i}`],
    env[`GIT_CONFIG_VALUE_${i}`],
  ]).filter(([key]) => key !== undefined);
  const kept = pairs.filter(
    ([key, value]) =>
      !String(key).startsWith(HOOK_PREFIX) &&
      !(ENABLED_KEYS.includes(String(key)) && value === "true"),
  );
  if (kept.length === count) return settings;
  const next: Json = { ...env };
  for (let i = 0; i < count; i++) {
    delete next[`GIT_CONFIG_KEY_${i}`];
    delete next[`GIT_CONFIG_VALUE_${i}`];
  }
  kept.forEach(([key, value], i) => {
    next[`GIT_CONFIG_KEY_${i}`] = key;
    next[`GIT_CONFIG_VALUE_${i}`] = value;
  });
  if (kept.length > 0) next["GIT_CONFIG_COUNT"] = String(kept.length);
  else delete next["GIT_CONFIG_COUNT"];
  return { ...settings, env: next };
};

/**
 * `settings` without the values that only the 0.1.0 snippet wrote (`LEGACY_KEYS`):
 * `promptCacheTtl: "5m"` and the `permissions.ask` rules.
 * The `ask` rules go only when the user has all of them, which is the 0.1.0 signature,
 * because one of them alone can be a safety rule of the user.
 * The other keys and rules of the user stay.
 */
export const cleanLegacyKeys = (settings: Json): Json => {
  const { promptCacheTtl, ...out }: Json = settings;
  if (promptCacheTtl !== "5m" && promptCacheTtl !== undefined)
    out["promptCacheTtl"] = promptCacheTtl;
  const { ask: oldAsk } = LEGACY_KEYS;
  const { permissions: perms } = out;
  const ask: unknown = isObject(perms) ? perms["ask"] : undefined;
  if (
    isObject(perms) &&
    Array.isArray(ask) &&
    oldAsk.every((rule) => ask.includes(rule))
  )
    out["permissions"] = {
      ...perms,
      ask: ask.filter((v) => !oldAsk.includes(v)),
    };
  return out;
};

/**
 * `settings` without each value of `old` that `now` does not have, with one line in `changes` for each removed value.
 * A scalar goes when it equals the old value.
 * The old entries of a list go only when the list has all of them, which is the signature of the old snippet.
 * An object that this makes empty goes.
 */
const dropOld = (
  settings: Json,
  old: Json,
  now: Json,
  changes: string[],
  at = "",
): Json => {
  const out: Json = { ...settings };
  for (const [key, was] of Object.entries(old)) {
    const where = at ? `${at}.${key}` : key;
    const next = dropValue(was, out[key], now[key], where, changes);
    if (next === SKIP) continue;
    if (next === undefined) delete out[key];
    else out[key] = next;
  }
  return out;
};

/** The result of `dropValue` for a list that does not have each old entry: the list stays as it is. */
const SKIP = Symbol("skip");

/** The list `has` without the entries of `was` that `keep` does not have, or `SKIP` when `has` lacks an old entry. */
const dropEntries = (
  was: unknown[],
  has: unknown[],
  keep: unknown,
  where: string,
  changes: string[],
): unknown => {
  if (!was.every((v) => has.includes(v))) return SKIP;
  const gone = was.filter((v) => !(Array.isArray(keep) && keep.includes(v)));
  for (const entry of gone)
    changes.push(DROPPED_ENTRY({ key: where, entry: String(entry) }));
  const kept = has.filter((v) => !gone.includes(v));
  return kept.length > 0 ? kept : undefined;
};

/** The value `has` after the removal of the old value `was`, `undefined` for a value that goes, or `SKIP`. */
const dropValue = (
  was: unknown,
  has: unknown,
  keep: unknown,
  where: string,
  changes: string[],
): unknown => {
  if (isObject(was) && isObject(has)) {
    const kept = dropOld(has, was, isObject(keep) ? keep : {}, changes, where);
    return Object.keys(kept).length > 0 ? kept : undefined;
  }
  if (Array.isArray(was) && Array.isArray(has))
    return dropEntries(was, has, keep, where, changes);
  if (keep === undefined && JSON.stringify(has) === JSON.stringify(was)) {
    changes.push(DROPPED_KEY({ key: where }));
    return undefined;
  }
  return has;
};

const CODEGRAPH_HOOK = "codegraph prompt-hook";

/** `settings` without the `UserPromptSubmit` hook of `codegraph install`, and without an event or `hooks` that this makes empty. */
const dropCodegraph = (settings: Json, changes: string[]): Json => {
  const hooks = settings["hooks"];
  const groups = isObject(hooks) ? hooks["UserPromptSubmit"] : undefined;
  if (!isObject(hooks) || !Array.isArray(groups)) return settings;
  const kept = groups
    .map((g: Json) => ({
      ...g,
      hooks: (g["hooks"] as Json[]).filter(
        (h) => h["command"] !== CODEGRAPH_HOOK,
      ),
    }))
    .filter((g) => g.hooks.length > 0);
  if (JSON.stringify(kept) === JSON.stringify(groups)) return settings;
  changes.push(DROPPED_HOOK({ command: CODEGRAPH_HOOK }));
  const { UserPromptSubmit: _old, ...events } = hooks;
  const next: Json =
    kept.length > 0 ? { ...events, UserPromptSubmit: kept } : events;
  const { hooks: _hooks, ...out } = settings;
  return Object.keys(next).length > 0 ? { ...out, hooks: next } : out;
};

/**
 * `settings` without the keys that 0.2.0 wrote and 0.3.0 drops, without `autoMode`,
 * and without the hook of `codegraph install`, with one line in `changes` for each removed key.
 */
export const cleanUpgrade = (settings: Json, changes: string[]): Json => {
  const { autoMode, ...out } = dropOld(settings, OLD, SNIPPET, changes);
  if (autoMode !== undefined) changes.push(DROPPED_AUTO_MODE);
  return dropCodegraph(out, changes);
};

/** `text` without the claudetto block, or `text` when it has no block in order. */
export const stripBlock = (text: string): string => {
  const begin = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (begin < 0 || end < begin) return text;
  const joined = [
    text.slice(0, begin).trimEnd(),
    text.slice(end + END.length).trimStart(),
  ]
    .filter(Boolean)
    .join("\n\n");
  return joined && `${joined}\n`;
};
