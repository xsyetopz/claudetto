// The check on a weaker test file or limits file (package P36), as pure functions.
// Each function compares the text before and after a call and gives what got weaker, or undefined.
// A test file gets an ask when a line of code goes away or changes.
// A change of format or comments, a move of lines, a rename of a test title, and an added line get no ask from this check.
// The check reads no word of a test framework in an added line, so it works the same in each language.
// An added line goes to the judge of `testjudge.ts`, which reads its meaning in any language.
// A limits file gets weaker when a bound changes value or goes away, or when code that is not a bound changes.

import {
  BOUND_CODE_FILE,
  BOUND_DECLARATION,
  HASH_COMMENT_FILE,
  TEST_DECLARATION,
} from "../limits.ts";
import {
  BOUND_CHANGED,
  BOUND_LINE_CHANGED,
  LIMITS_CODE_CHANGED,
  TEST_LINE_LOST,
} from "../prompts.ts";
import { joinImports, withoutAddedNames } from "./imports.ts";
import { flatten, readJson } from "./jsondiff.ts";
import { textOf } from "./linediff.ts";
import { missing, normal, squeeze, statementAt, uncommented } from "./scan.ts";
import { shown } from "./shown.ts";

/** The text of `line` with the inside of each string cut out, so that a word in a title is not code. */
const bare = (line: string): string =>
  line.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g, '""');

/**
 * The identity of a line: the line itself, but a test declaration without its title.
 * A rename of a title is not a change.
 */
const identity = (line: string): string => {
  const mark = line.slice(0, line.length - textOf(line).length);
  const body = textOf(line);
  return TEST_DECLARATION.some((re) => re.test(body))
    ? mark + bare(body).replace(/\b(def test|func Test)\w*/, "$1")
    : line;
};

/** The lines of code in `text`: no comment, no blank line, and one space for each run of spaces. Python keeps its indent. */
const codeLines = (text: string, hash: boolean, indent: boolean): string[] =>
  joinImports(uncommented(text, hash))
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const body = squeeze(line);
      return indent ? `${line.length - line.trimStart().length}|${body}` : body;
    });

/**
 * What a call takes from a test file, or undefined.
 * A line of code that goes away or changes asks. A Python line that changes its indent changes.
 */
export const testWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  const hash = HASH_COMMENT_FILE.test(rel);
  const python = rel.endsWith(".py");
  if (
    !python &&
    normal(uncommented(before, hash)) === normal(uncommented(after, hash))
  )
    return undefined;
  const [was, now] = [
    codeLines(before, hash, python),
    codeLines(after, hash, python),
  ];
  const [a, b] = withoutAddedNames(was.map(identity), now.map(identity));
  const lost = missing(a, b)[0];
  return lost === undefined
    ? undefined
    : TEST_LINE_LOST({ line: shown(textOf(lost)) });
};

/** True when a call adds a line of code to a test file. A move, a rename of a title, and a format change add no line. */
export const addsCode = (
  rel: string,
  before: string,
  after: string,
): boolean => {
  const hash = HASH_COMMENT_FILE.test(rel);
  const python = rel.endsWith(".py");
  if (
    !python &&
    normal(uncommented(before, hash)) === normal(uncommented(after, hash))
  )
    return false;
  const [was, now] = [
    codeLines(before, hash, python),
    codeLines(after, hash, python),
  ];
  const [a, b] = withoutAddedNames(was.map(identity), now.map(identity));
  return missing(b, a).length > 0;
};

/** The value of each bound that `text` declares in code, as a map from the name to the normal form of the value. */
const bounds = (text: string, hash: boolean): Map<string, string> => {
  const code = uncommented(text, hash);
  const map = new Map<string, string>();
  for (const re of BOUND_DECLARATION)
    for (const m of code.matchAll(new RegExp(re.source, "gm"))) {
      const from = m.index + m[0].length;
      map.set(m[1] as string, normal(statementAt(code, from)));
    }
  return map;
};

/** The first bound of `was` that `now` changes or does not declare, as `NAME`, or undefined. */
const changedBound = (
  was: Map<string, string>,
  now: Map<string, string>,
): string | undefined => [...was.keys()].find((k) => was.get(k) !== now.get(k));

/**
 * The normal form of the code of `text` without its bound statements.
 * A line that the bound reader does not read stays in this form, so a change of it shows.
 */
const unread = (text: string, hash: boolean): string => {
  const code = uncommented(text, hash);
  const cut: [number, number][] = [];
  for (const re of BOUND_DECLARATION)
    for (const m of code.matchAll(new RegExp(re.source, "gm"))) {
      const from = m.index + m[0].length;
      const stop = from + statementAt(code, from).length;
      cut.push([m.index, code[stop] === ";" ? stop + 1 : stop]);
    }
  cut.sort((a, b) => a[0] - b[0]);
  let [out, at] = ["", 0];
  for (const [s, e] of cut) {
    if (s >= at) out += code.slice(at, s);
    at = Math.max(at, e);
  }
  return normal(out + code.slice(at));
};

/**
 * What a call does to the bounds of a limits file, or undefined.
 * A code file has declarations, and a JSON file has values.
 * Another format gives the lines with a number, and a lost one counts.
 */
export const limitsWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  if (BOUND_CODE_FILE.test(rel)) {
    const hash = HASH_COMMENT_FILE.test(rel);
    const name = changedBound(bounds(before, hash), bounds(after, hash));
    if (name !== undefined) return BOUND_CHANGED({ name });
    return unread(before, hash) === unread(after, hash)
      ? undefined
      : LIMITS_CODE_CHANGED;
  }
  if (rel.endsWith(".json")) {
    const [was, now] = [readJson(before), readJson(after)];
    if (was !== undefined && now !== undefined) {
      const [a, b] = [flatten(was), flatten(now)];
      const key = [...a.keys()].find((k) => a.get(k) !== b.get(k));
      return key === undefined ? undefined : BOUND_CHANGED({ name: key });
    }
  }
  const lines = (t: string) =>
    uncommented(t, true)
      .split("\n")
      .map((l) => normal(l))
      .filter((l) => /\d/.test(l));
  const lost = missing(lines(before), lines(after))[0];
  return lost === undefined
    ? undefined
    : BOUND_LINE_CHANGED({ line: shown(lost) });
};
