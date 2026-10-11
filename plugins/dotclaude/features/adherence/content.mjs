// The content checks of the ask for a change that can hide a defect (decision H5), as pure functions.
// They look at the text before and after a call: the keys of a settings file, the tool sections of
// `pyproject.toml` and `setup.cfg`, the check scripts of `package.json`, and the check recipes of a `justfile` or `Makefile`.
// `ch` is the effect from `change` in `text.mjs`.

import {
  CHECK_RECIPE,
  CHECK_SCRIPT,
  PYPROJECT_SECTIONS,
  RECIPE_FILE_NAMES,
  SETTINGS_KEYS,
  SETUP_CFG_SECTIONS,
} from "./limits.mjs";

/** The JSON object of `text`, `{}` for an absent file, or undefined when the text is not a JSON object. */
const objectOf = (text) => {
  try {
    const v = JSON.parse(text ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : undefined;
  } catch {
    return undefined;
  }
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** The first of `names` that differs between the objects `was` and `now`, or undefined. */
const differs = (was, now, names) =>
  names.find((k) => !same(was?.[k], now?.[k]));

/**
 * The key of `SETTINGS_KEYS` that a call changes in a `.claude/settings*.json` file, or undefined.
 * Text that is not JSON counts a key when the added text names it.
 */
export function settingsKey(ch) {
  const [was, now] = [objectOf(ch.before), objectOf(ch.after)];
  if (ch.after !== null && was && now) return differs(was, now, SETTINGS_KEYS);
  return SETTINGS_KEYS.find((k) => ch.fragment.includes(`"${k}"`));
}

/** The sections of a TOML or INI `text`, as a map from the section name to its body. */
function sections(text) {
  const map = new Map();
  let name = "";
  for (const line of (text ?? "").split("\n")) {
    const head = /^\s*\[+\s*([^\]]+?)\s*\]+\s*(?:#.*)?$/.exec(line);
    if (head) name = head[1];
    map.set(name, `${map.get(name) ?? ""}${line}\n`);
  }
  return map;
}

/**
 * The name of a section that matches `re` and differs between the text before and after a call, or undefined.
 * When the call does not apply to the file, a section header in the added text counts.
 */
export function sectionChanged(ch, re) {
  if (ch.after === null) {
    for (const line of ch.fragment.split("\n")) {
      const head = /^\s*\[+\s*([^\]]+?)\s*\]+/.exec(line);
      if (head && re.test(head[1])) return head[1];
    }
    return undefined;
  }
  const [was, now] = [sections(ch.before), sections(ch.after)];
  return [...new Set([...was.keys(), ...now.keys()])].find(
    (k) => re.test(k) && was.get(k) !== now.get(k),
  );
}

/** True when `value` reads as a version spec of a dependency and not as a script command. */
const versionLike = (value) =>
  /^[\^~<>=v\s]*\d|^(?:\*|latest|(?:workspace|npm|file|link|git|github):)/.test(
    value,
  );

/**
 * The name of a `package.json` script that runs a check and that a call changes, or undefined.
 * For a JSON object, only the keys inside the `scripts` value count.
 * For other text, a quoted key with a string value counts when the value is not a version spec and the key is not a package name.
 */
export function checkScriptChanged(ch) {
  const [was, now] = [objectOf(ch.before), objectOf(ch.after)];
  if (ch.after !== null && was && now) {
    const [a, b] = [was.scripts ?? {}, now.scripts ?? {}];
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].find(
      (k) => CHECK_SCRIPT.test(k) && !same(a[k], b[k]),
    );
  }
  for (const m of ch.fragment.matchAll(/"([^"\n]*)"\s*:\s*"([^"\n]*)"/g))
    if (CHECK_SCRIPT.test(m[1]) && !/^@|\//.test(m[1]) && !versionLike(m[2]))
      return m[1];
  return undefined;
}

/** The recipes of a `justfile` or `Makefile` `text`, as a map from the first name of the header to `{ head, body }`. */
function recipes(text) {
  const map = new Map();
  let key = "";
  for (const line of (text ?? "").split("\n")) {
    const head = /^([@\w.%/-][^\s:=]*)([^:\n]*?):(?!=)/.exec(line);
    if (head && !/^(?:set|import|export|alias|mod)\s/.test(line)) {
      key = head[1].replace(/^@/, "");
      map.set(key, { head: line, body: "" });
    } else if (!/^\s|^$/.test(line)) key = "";
    else if (key) map.get(key).body += `${line}\n`;
  }
  return map;
}

/**
 * The name of a recipe or target that runs a check and that a call changes, or undefined.
 * A recipe counts when its name or its header names a check word, and its header or body differs.
 * When the call does not apply to the file, a header line in the added text counts.
 */
export function checkRecipeChanged(ch) {
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
}

/** The label of the content kind of a call for the file `rel` and the name `name`, or undefined. */
export function contentKind(rel, name, ch) {
  const parts = rel.split("/");
  if (parts.at(-2) === ".claude" && /^settings.*\.json$/.test(name)) {
    const key = settingsKey(ch);
    if (key) return "a settings file";
  }
  if (name === "pyproject.toml" && sectionChanged(ch, PYPROJECT_SECTIONS))
    return "a lint config file";
  if (name === "setup.cfg" && sectionChanged(ch, SETUP_CFG_SECTIONS))
    return "a lint config file";
  if (name === "package.json" && checkScriptChanged(ch))
    return "a file with a check script";
  if (RECIPE_FILE_NAMES.test(name) && checkRecipeChanged(ch))
    return "a build file with a check recipe";
  return undefined;
}
