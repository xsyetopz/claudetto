// The check on a weaker config in a text format (package P36), as pure functions.
// The formats are TOML, INI, YAML, a shell file, and a JavaScript or TypeScript config.
// The function compares the lines before and after a call, and it needs no parser.
// A line that moved or got a new format (spaces, comment) is not a change.
// A lost line is a loss when no added line with the same key replaces it with a stricter value.
// An added line is a loss when it switches a check off, skips it, or lets it fail (`WEAKENING_LINE`).
// An added line inherits the key of the list above it, so a new entry of an `ignore` list counts.

import {
  IGNORE_KEY,
  LABEL_LINE,
  LEVEL_RANK,
  MAXIMUM_KEY,
  THRESHOLD_KEY,
  WEAKENING_LINE,
} from "../limits.ts";
import { missing, uncommented } from "./scan.ts";
import { shown } from "./shown.ts";

/** One line of a config: the trimmed text and the text of the line above it that opens its list. */
type Line = { text: string; above: string };

/** The key and the value of a line such as `key = value`, `key: value`, or `- key: value`. */
const keyValue = (text: string): { key: string; value: string } | undefined => {
  const m = /^(?:-\s+)?["']?([\w.@/ -]+?)["']?\s*[:=]\s*(.*?),?$/.exec(text);
  return m
    ? {
        key: m[1] as string,
        value: (m[2] as string)
          .replace(/^["']|["']$/g, "")
          .replace(/\s*([[\]{},])\s*/g, "$1"),
      }
    : undefined;
};

/** The non-blank lines of `text` without comments, each with the line above it that opens a list. */
const linesOf = (text: string, hash: boolean): Line[] => {
  const out: Line[] = [];
  const stack: { indent: number; text: string }[] = [];
  for (const raw of uncommented(text, hash).split("\n")) {
    const text = raw.trim().replace(/\s+/g, " ");
    if (text === "") continue;
    const indent = raw.length - raw.trimStart().length;
    while (
      stack.length &&
      (stack.at(-1) as { indent: number }).indent >= indent
    )
      stack.pop();
    out.push({ text, above: stack.map((s) => s.text).join(" ") });
    if (/[:=]\s*[[{(]?$|[[{(]$/.test(text)) stack.push({ indent, text });
  }
  return out;
};

/** What the change of a value from `was` to `now` under `key` does to a check, or undefined when it keeps or adds checks. */
const valueWeaker = (
  key: string,
  was: string,
  now: string,
): string | undefined => {
  const [a, b] = [LEVEL_RANK[was.toLowerCase()], LEVEL_RANK[now.toLowerCase()]];
  if (a !== undefined && b !== undefined)
    return b < a
      ? `It lowers the level of \`${key}\` to \`${now}\`.`
      : undefined;
  const [x, y] = [Number(was), Number(now)];
  if (was !== "" && now !== "" && !Number.isNaN(x) && !Number.isNaN(y)) {
    if (THRESHOLD_KEY.test(key))
      return y < x
        ? `It lowers the threshold \`${key}\` to ${now}.`
        : undefined;
    if (MAXIMUM_KEY.test(key))
      return y > x ? `It raises the limit \`${key}\` to ${now}.` : undefined;
  }
  if (was === now) return undefined;
  if (was === "true" && now === "false") return `It turns \`${key}\` off.`;
  if (was === "false" && now === "true") return undefined;
  return `It changes the value of \`${key}\` from \`${shown(was)}\` to \`${shown(now)}\`.`;
};

/**
 * What the change from `before` to `after` takes from a config in a text format, or undefined.
 * `hash` is true when `#` starts a comment.
 */
export const textWeaker = (
  before: string,
  after: string,
  hash: boolean,
): string | undefined => {
  const [was, now] = [linesOf(before, hash), linesOf(after, hash)];
  const lost = missing(
    was.map((l) => l.text),
    now.map((l) => l.text),
  );
  const left = new Map<string, number>();
  for (const l of was) left.set(l.text, (left.get(l.text) ?? 0) + 1);
  const newLines = now.filter((l) => {
    const n = left.get(l.text) ?? 0;
    if (n) left.set(l.text, n - 1);
    return n === 0;
  });
  for (const l of newLines)
    if (WEAKENING_LINE.some((re) => re.test(`${l.above} ${l.text}`)))
      return `It adds the line \`${shown(l.text)}\`, which switches a check off or lets it fail.`;
  const pool = [...newLines];
  for (const text of lost) {
    if (LABEL_LINE.test(text)) continue;
    const old = keyValue(text);
    const at = was.find((l) => l.text === text);
    if (IGNORE_KEY.test(`${at?.above ?? ""} ${old?.key ?? ""}`)) continue;
    const i = old
      ? pool.findIndex((l) => keyValue(l.text)?.key === old.key)
      : -1;
    if (old && i >= 0) {
      const next = keyValue((pool.splice(i, 1)[0] as Line).text) as {
        value: string;
      };
      const found = valueWeaker(old.key, old.value, next.value);
      if (found) return found;
    } else return `It removes the line \`${shown(text)}\`.`;
  }
  return undefined;
};
