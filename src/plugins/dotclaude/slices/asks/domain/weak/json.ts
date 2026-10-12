// The check on a weaker JSON config (package P36), as pure functions.
// A JSON config is a lint config, a check runner config, or the JSON part of a settings file.
// The functions compare the value before and after a call and give what got weaker, or undefined.
// A rule goes off or to a lower level, a threshold gets lower, a limit gets higher,
// an entry joins an ignore list, an entry leaves another list, a flag goes from true to false, or a key goes away.

import {
  IGNORE_KEY,
  IGNORED_JSON_KEY,
  JSON_DEPTH_MAX,
  LEVEL_RANK,
  MAXIMUM_KEY,
  THRESHOLD_KEY,
} from "../../limits.ts";

/** What a function gives when the text has a format that it cannot read. */
export const UNREADABLE = "The check cannot read the format of this change.";

/** The text without comments and without trailing commas, so that a `jsonc` file parses. */
const plain = (text: string): string => {
  let out = "";
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      out += ch;
      if (ch === "\\") out += text[++i] ?? "";
      else if (ch === '"') quote = false;
    } else if (ch === '"') {
      quote = true;
      out += ch;
    } else if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 1;
    } else out += ch;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
};

/** The JSON value of `text` (comments and trailing commas allowed), or undefined when it does not parse. */
export const readJson = (text: string): unknown => {
  try {
    return JSON.parse(plain(text.replace(/^﻿/, "")));
  } catch {
    return undefined;
  }
};

/** A JSON object. */
export type Obj = Record<string, unknown>;

/** True when `v` is a JSON object and not an array. */
export const isObj = (v: unknown): v is Obj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** The leaves of `value` as a map from the dotted path to the JSON text of the leaf. An array is one leaf. */
export const flatten = (value: unknown, path = ""): Map<string, string> => {
  const map = new Map<string, string>();
  if (isObj(value))
    for (const [k, v] of Object.entries(value))
      for (const [p, s] of flatten(v, path ? `${path}.${k}` : k)) map.set(p, s);
  else map.set(path, JSON.stringify(value));
  return map;
};

/** The rank of a level, or undefined when `v` is not a level. */
const rank = (v: unknown): number | undefined =>
  typeof v === "string" ? LEVEL_RANK[v.toLowerCase()] : undefined;

/** The text of a path for a reason. */
const at = (path: string[]): string => `\`${path.join(".") || "(file)"}\``;

/** What a scalar change does to a check, or undefined. `rules` is true under a key named `rules`. */
const scalar = (
  was: unknown,
  now: unknown,
  path: string[],
  rules: boolean,
): string | undefined => {
  const key = path.at(-1) ?? "";
  const [a, b] = [rank(was), rank(now)];
  if (a !== undefined && b !== undefined && b < a)
    return `It lowers the level of ${at(path)} to \`${String(now)}\`.`;
  if (was === true && now === false) return `It turns ${at(path)} off.`;
  if (typeof was !== "number" || typeof now !== "number") return undefined;
  if (rules && was <= 2 && now < was)
    return `It lowers the level of ${at(path)}.`;
  if (THRESHOLD_KEY.test(key) && now < was)
    return `It lowers the threshold ${at(path)} from ${was} to ${now}.`;
  if (MAXIMUM_KEY.test(key) && now > was)
    return `It raises the limit ${at(path)} from ${was} to ${now}.`;
  return undefined;
};

/** The entries of `list` as JSON texts. */
const texts = (list: unknown[]): string[] => list.map((v) => JSON.stringify(v));

/** What a change of a list does, or undefined. An ignore list gets weaker with a new entry, and another list with a lost one. */
const listWeaker = (
  was: unknown[],
  now: unknown[],
  path: string[],
): string | undefined => {
  let [a, b] = [was, now];
  if (rank(a[0]) !== undefined && rank(b[0]) !== undefined) {
    const lowered = scalar(a[0], b[0], path, true);
    if (lowered) return lowered;
    [a, b] = [a.slice(1), b.slice(1)];
  }
  const [oldTexts, newTexts] = [texts(a), texts(b)];
  if (path.some((p) => IGNORE_KEY.test(p))) {
    const added = newTexts.find((t) => !oldTexts.includes(t));
    return added === undefined
      ? undefined
      : `It adds the entry \`${added}\` to ${at(path)}.`;
  }
  const lost = oldTexts.find((t) => !newTexts.includes(t));
  return lost === undefined
    ? undefined
    : `It removes the entry \`${lost}\` from ${at(path)}.`;
};

/** What a value that is new does to a check: a new ignore entry or a new flag that skips. */
const added = (value: unknown, path: string[]): string | undefined => {
  if (path.length > JSON_DEPTH_MAX) return UNREADABLE;
  if (isObj(value))
    for (const [k, v] of Object.entries(value)) {
      const found = added(v, [...path, k]);
      if (found) return found;
    }
  const ignoring = path.some((p) => IGNORE_KEY.test(p));
  const filled = Array.isArray(value) ? value.length > 0 : value === true;
  return ignoring && filled && !isObj(value)
    ? `It adds ${at(path)} to the config.`
    : undefined;
};

/**
 * What the change from `was` to `now` takes from a JSON config, or undefined.
 * `path` is the keys above the value, and a key in `IGNORED_JSON_KEY` is not compared.
 */
export const jsonWeaker = (
  was: unknown,
  now: unknown,
  path: string[] = [],
): string | undefined => {
  if (path.length > JSON_DEPTH_MAX) return UNREADABLE;
  if (was === undefined) return added(now, path);
  if (isObj(was) && isObj(now)) {
    for (const [k, v] of Object.entries(was)) {
      if (IGNORED_JSON_KEY.test(k)) continue;
      const sub = [...path, k];
      if (!(k in now)) {
        if (!sub.some((p) => IGNORE_KEY.test(p)))
          return `It removes ${at(sub)}.`;
        continue;
      }
      const found = jsonWeaker(v, now[k], sub);
      if (found) return found;
    }
    for (const [k, v] of Object.entries(now))
      if (!(k in was) && !IGNORED_JSON_KEY.test(k)) {
        const found = added(v, [...path, k]);
        if (found) return found;
      }
    return undefined;
  }
  if (Array.isArray(was) && Array.isArray(now))
    return listWeaker(was, now, path);
  if (JSON.stringify(was) === JSON.stringify(now)) return undefined;
  if (isObj(was) || Array.isArray(was) || isObj(now) || Array.isArray(now))
    return `It changes the kind of the value ${at(path)}.`;
  return scalar(was, now, path, path.at(-2) === "rules");
};
