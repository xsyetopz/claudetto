// The content checks of the ask for a change that can hide a defect (decision H5), as pure functions.
// They look at the text before and after a call: the check scripts of `package.json`, and the check recipes of a `justfile` or `Makefile`.
// `ch` is the effect from `change` in `text.ts`.

import { CHECK_RECIPE, CHECK_SCRIPT, RECIPE_FILE_NAMES } from "../limits.ts";
import type { Change } from "./text.ts";

/** A JSON object, as the keys and values that the checks read from it. */
type JsonObject = Record<string, unknown>;

/** The head and the body of a recipe of a `justfile` or `Makefile`. */
type Recipe = { head: string; body: string };

/** The JSON object of `text`, `{}` for an absent file, or undefined when the text is not a JSON object. */
const objectOf = (text: string | null): JsonObject | undefined => {
  try {
    const v: unknown = JSON.parse(text ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v)
      ? (v as JsonObject)
      : undefined;
  } catch {
    return undefined;
  }
};

const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The sections of a TOML or INI `text`, as a map from the section name to its body. */
export const sections = (text: string | null): Map<string, string> => {
  const map = new Map<string, string>();
  let name = "";
  for (const line of (text ?? "").split("\n")) {
    const head = /^\s*\[+\s*([^\]]+?)\s*\]+\s*(?:#.*)?$/.exec(line);
    if (head) name = head[1] as string;
    map.set(name, `${map.get(name) ?? ""}${line}\n`);
  }
  return map;
};

/** True when `value` reads as a version spec of a dependency and not as a script command. */
const versionLike = (value: string): boolean =>
  /^[\^~<>=v\s]*\d|^(?:\*|latest|(?:workspace|npm|file|link|git|github):)/.test(
    value,
  );

/**
 * The name of a `package.json` script that runs a check and that a call changes, or undefined.
 * For a JSON object, only the keys inside the `scripts` value count.
 * For other text, a quoted key with a string value counts when the value is not a version spec and the key is not a package name.
 */
export const checkScriptChanged = (ch: Change): string | undefined => {
  const [was, now] = [objectOf(ch.before), objectOf(ch.after)];
  if (ch.after !== null && was && now) {
    const [a, b] = [
      (was["scripts"] ?? {}) as JsonObject,
      (now["scripts"] ?? {}) as JsonObject,
    ];
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].find(
      (k) => CHECK_SCRIPT.test(k) && !same(a[k], b[k]),
    );
  }
  for (const m of ch.fragment.matchAll(/"([^"\n]*)"\s*:\s*"([^"\n]*)"/g)) {
    const [name, value] = [m[1] as string, m[2] as string];
    if (CHECK_SCRIPT.test(name) && !/^@|\//.test(name) && !versionLike(value))
      return name;
  }
  return undefined;
};

/** The recipes of a `justfile` or `Makefile` `text`, as a map from the first name of the header to `{ head, body }`. */
const recipes = (text: string | null): Map<string, Recipe> => {
  const map = new Map<string, Recipe>();
  let key = "";
  for (const line of (text ?? "").split("\n")) {
    const head = /^([@\w.%/-][^\s:=]*)([^:\n]*?):(?!=)/.exec(line);
    if (head && !/^(?:set|import|export|alias|mod)\s/.test(line)) {
      key = (head[1] as string).replace(/^@/, "");
      map.set(key, { head: line, body: "" });
    } else if (!/^\s|^$/.test(line)) key = "";
    else if (key) (map.get(key) as Recipe).body += `${line}\n`;
  }
  return map;
};

/**
 * The name of a recipe or target that runs a check and that a call changes, or undefined.
 * A recipe counts when its name or its header names a check word, and its header or body differs.
 * When the call does not apply to the file, a header line in the added text counts.
 */
export const checkRecipeChanged = (ch: Change): string | undefined => {
  if (ch.after === null) {
    for (const line of ch.fragment.split("\n")) {
      const head = /^([@\w.%/-][^\s:=]*)([^:\n]*?):(?!=)/.exec(line);
      if (head && CHECK_RECIPE.test(head[0])) return head[1];
    }
    return undefined;
  }
  const [was, now] = [recipes(ch.before), recipes(ch.after)];
  return [...new Set([...was.keys(), ...now.keys()])].find((k) => {
    const [a, b] = [was.get(k), now.get(k)];
    return (
      CHECK_RECIPE.test(`${a?.head ?? ""}${b?.head ?? ""}`) &&
      (a?.head !== b?.head || a?.body !== b?.body)
    );
  });
};

/** The label of the content kind of a call for the file `rel` and the name `name`, or undefined. */
export const contentKind = (name: string, ch: Change): string | undefined => {
  if (name === "package.json" && checkScriptChanged(ch))
    return "a file with a check script";
  if (RECIPE_FILE_NAMES.test(name) && checkRecipeChanged(ch))
    return "a build file with a check recipe";
  return undefined;
};
