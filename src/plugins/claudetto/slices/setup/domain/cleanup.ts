// The cleanup of the keys that claudetto 0.1.0 wrote to a settings file and to `CLAUDE.md`.
// Each function removes only what 0.1.0 wrote, and leaves the keys of the user.

import { LEGACY_RULES } from "../prompts.ts";
import { isObject, type Json } from "./merge.ts";

/** The lines that open and close the claudetto block of `CLAUDE.md`. */
const BEGIN = "<!-- claudetto:begin -->";
const END = "<!-- claudetto:end -->";

/** The prefix of the names of the git hooks that 0.1.0 put in `env`. */
const HOOK_PREFIX = "hook.claudetto-";

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
  ]).filter(([key]) => !String(key).startsWith(HOOK_PREFIX));
  if (pairs.length === count) return settings;
  const next: Json = { ...env };
  for (let i = 0; i < count; i++) {
    delete next[`GIT_CONFIG_KEY_${i}`];
    delete next[`GIT_CONFIG_VALUE_${i}`];
  }
  pairs.forEach(([key, value], i) => {
    next[`GIT_CONFIG_KEY_${i}`] = key;
    next[`GIT_CONFIG_VALUE_${i}`] = value;
  });
  if (pairs.length > 0) next["GIT_CONFIG_COUNT"] = String(pairs.length);
  else delete next["GIT_CONFIG_COUNT"];
  return { ...settings, env: next };
};

/** `settings` without the rule texts of 0.1.0 in `autoMode.soft_deny` and `autoMode.hard_deny`. */
export const cleanAutoMode = (settings: Json): Json => {
  const auto = settings["autoMode"];
  if (!isObject(auto)) return settings;
  const next: Json = { ...auto };
  for (const [key, old] of Object.entries(LEGACY_RULES as Json)) {
    const list = auto[key];
    if (Array.isArray(list))
      next[key] = list.filter((v) => !(old as unknown[]).includes(v));
  }
  return { ...settings, autoMode: next };
};

/** `text` without the claudetto block, or `text` when it has no block in order. */
export const stripBlock = (text: string): string => {
  const begin = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  if (begin < 0 || end < begin) return text;
  const rest = [
    text.slice(0, begin).trimEnd(),
    text.slice(end + END.length).trimStart(),
  ];
  const joined = rest.filter(Boolean).join("\n\n");
  return joined && `${joined}\n`;
};
