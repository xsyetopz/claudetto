// A reader of a lint config or a runner config as a flat map of dotted paths (package P36), as pure functions.
// The formats are JSON (with comments), TOML, and INI. YAML is in `yamlmap.ts`.
// A value is a text, and a list is a list of texts, so that the formats compare with each other.
// A function gives undefined when it cannot read the format, so that the caller asks.

import { JSON_DEPTH_MAX } from "../limits.ts";
import { isObj, readJson } from "./jsondiff.ts";

/** A config as a map from a dotted path to a text, or to a list of texts. */
export type Conf = Map<string, string | string[]>;

/** The JSON text of `value` with the keys of each object in order, so that the order of keys is not a change. */
const canonical = (value: unknown): string =>
  isObj(value)
    ? `{${Object.keys(value)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
        .join(",")}}`
    : Array.isArray(value)
      ? `[${value.map(canonical).join(",")}]`
      : JSON.stringify(value);

/** The text of a JSON leaf: a string as it is, and other values as JSON. */
const leafText = (value: unknown): string =>
  typeof value === "string" ? value : canonical(value);

const putJson = (
  out: Conf,
  value: unknown,
  path: string,
  depth: number,
): boolean => {
  if (depth > JSON_DEPTH_MAX) return false;
  if (!isObj(value)) {
    out.set(path, Array.isArray(value) ? value.map(leafText) : leafText(value));
    return true;
  }
  return Object.entries(value).every(([k, v]) =>
    putJson(out, v, path ? `${path}.${k}` : k, depth + 1),
  );
};

/** The map of a JSON text with comments, or undefined when it does not parse. A blank text is an empty map. */
export const jsonConf = (text: string): Conf | undefined => {
  const out: Conf = new Map();
  if (text.trim() === "") return out;
  const value = readJson(text);
  return value !== undefined && putJson(out, value, "", 0) ? out : undefined;
};

/** The line without a comment: `#` at the start or after a space outside a quote, and `;` the same way for INI. */
export const stripComment = (line: string, semicolon: boolean): string => {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = null;
    } else if ((ch === '"' || ch === "'") && line.indexOf(ch, i + 1) !== -1)
      quote = ch;
    else if (
      (ch === "#" || (semicolon && ch === ";")) &&
      (i === 0 || /\s/.test(line[i - 1] as string))
    )
      return line.slice(0, i);
  }
  return line;
};

/** The text without the quote marks of a plain string, and with one space for each run of spaces. */
export const unquote = (text: string): string => {
  const t = text.trim();
  const m = /^"([^"\\]*)"$|^'([^']*)'$/.exec(t);
  return m ? ((m[1] ?? m[2]) as string) : t.replace(/\s+/g, " ");
};

/** The parts of `text` between commas outside quotes and brackets, without empty parts. */
export const splitTop = (text: string): string[] => {
  const parts: string[] = [];
  let [depth, quote, from] = [0, "", 0];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((p) => p.trim()).filter((p) => p !== "");
};

/** How many brackets a text opens more than it closes, outside quotes. */
const balance = (text: string): number => {
  let [depth, quote] = [0, ""];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quote) {
      if (ch === "\\" && quote === '"') i++;
      else if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
  }
  return depth;
};

const dotted = (key: string): string =>
  key
    .split(".")
    .map((p) => unquote(p))
    .join(".");

/** Puts the value text of a TOML or INI key in `out`. An inline table gives one path for each key. */
const putValue = (
  out: Conf,
  path: string,
  raw: string,
  ini: boolean,
): boolean => {
  const body = raw.trim();
  if (!ini && body.startsWith("[") && body.endsWith("]")) {
    out.set(path, splitTop(body.slice(1, -1)).map(unquote));
    return true;
  }
  if (!ini && body.startsWith("{") && body.endsWith("}"))
    return splitTop(body.slice(1, -1)).every((pair) => {
      const m = /^([^=]+?)\s*=\s*(.*)$/.exec(pair);
      return (
        m !== null &&
        putValue(
          out,
          `${path}.${dotted((m[1] as string).trim())}`,
          m[2] as string,
          ini,
        )
      );
    });
  out.set(path, unquote(body));
  return true;
};

/**
 * The map of a TOML or INI text, or undefined when a line has no form that the reader knows.
 * `keep` tells which sections to read, and a key above the first section has the section name `""`.
 */
export const sectionConf = (
  text: string,
  ini: boolean,
  keep: (section: string) => boolean = () => true,
): Conf | undefined => {
  const out: Conf = new Map();
  const tables = new Map<string, number>();
  const lines = text.split("\n").map((l) => stripComment(l, ini));
  let section = "";
  let last: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] as string;
    const line = raw.trim();
    if (line === "") continue;
    if (ini && /^\s/.test(raw) && (last !== undefined || !keep(section))) {
      if (last !== undefined)
        out.set(last, `${out.get(last) as string} ${unquote(line)}`.trim());
      continue;
    }
    const table = /^\[\[(.+)\]\]$/.exec(line);
    const head = /^\[(.+)\]$/.exec(line);
    if (table || head) {
      last = undefined;
      const name = unquote((table ?? head)?.[1] as string);
      const n = tables.get(name) ?? 0;
      if (table) tables.set(name, n + 1);
      section = table ? `${name}.${n}` : name;
      continue;
    }
    const m = (
      ini ? /^([^=:]+?)\s*[=:]\s*(.*)$/ : /^([^=]+?)\s*=\s*(.*)$/
    ).exec(line);
    if (!m) return undefined;
    let value = m[2] as string;
    while (!ini && balance(value) > 0 && i + 1 < lines.length)
      value += ` ${(lines[++i] as string).trim()}`;
    if (!ini && (balance(value) !== 0 || /^("""|''')/.test(value)))
      return undefined;
    const key = dotted((m[1] as string).trim());
    const path = [section, key].filter((p) => p !== "").join(".");
    const kept = keep(section);
    last = ini && kept ? path : undefined;
    if (kept && !putValue(out, path, value, ini)) return undefined;
  }
  return out;
};
