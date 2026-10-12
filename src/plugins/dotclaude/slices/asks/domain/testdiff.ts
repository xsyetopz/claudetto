// The check on a weaker test file or limits file (package P36), as pure functions.
// Each function compares the text before and after a call and gives what got weaker, or undefined.
// A test file gets no ask only when the change is on a short list of safe changes:
// a change of format or comments only, a move of lines, a rename of a test title,
// or added lines that hold no control flow, skip, focus, or timeout, while no line changes or goes away.
// A limits file gets weaker when a bound changes value or goes away.

import {
  BOUND_CODE_FILE,
  BOUND_DECLARATION,
  HASH_COMMENT_FILE,
  TEST_CONTROL,
  TEST_DECLARATION,
} from "../limits.ts";
import { flatten, readJson } from "./jsondiff.ts";
import { missing, normal, statementAt, uncommented } from "./scan.ts";
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
  uncommented(text, hash)
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const body = line.trim().replace(/\s+/g, " ");
      return indent ? `${line.length - line.trimStart().length}|${body}` : body;
    });

/** The text of a line without the indent mark of `codeLines`. */
const textOf = (line: string): string => line.replace(/^\d+\|/, "");

/** True when a line has control flow, a skip, a focus, or a timeout. */
const controls = (line: string): boolean =>
  TEST_CONTROL.test(bare(textOf(line)));

/** True when a control line of `now` has another line above it than in `was`, so that a move put it in a new place. */
const controlMoved = (was: string[], now: string[]): boolean => {
  const pairs = (lines: string[]): Set<string> =>
    new Set(
      lines.flatMap((l, i) =>
        controls(l) ? [`${lines[i - 1] ?? ""}\n${l}`] : [],
      ),
    );
  const known = pairs(was);
  return [...pairs(now)].some((p) => !known.has(p));
};

/**
 * What a call takes from a test file, or undefined.
 * A line that goes away or changes asks, and so does an added line with control flow.
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
  const [a, b] = [was.map(identity), now.map(identity)];
  const lost = missing(a, b)[0];
  if (lost !== undefined)
    return `It removes or changes the line \`${shown(textOf(lost))}\`.`;
  const added = missing(b, a);
  const hot = added.find(controls);
  if (hot !== undefined)
    return `It adds the line \`${shown(textOf(hot))}\`, which can skip a test or an assert.`;
  return added.length === 0 && controlMoved(a, b)
    ? "It moves a line with control flow."
    : undefined;
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
    return name === undefined
      ? undefined
      : `It changes or removes the bound \`${name}\`.`;
  }
  if (rel.endsWith(".json")) {
    const [was, now] = [readJson(before), readJson(after)];
    if (was !== undefined && now !== undefined) {
      const [a, b] = [flatten(was), flatten(now)];
      const key = [...a.keys()].find((k) => a.get(k) !== b.get(k));
      return key === undefined
        ? undefined
        : `It changes or removes the bound \`${key}\`.`;
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
    : `It changes or removes the line \`${shown(lost)}\`.`;
};
