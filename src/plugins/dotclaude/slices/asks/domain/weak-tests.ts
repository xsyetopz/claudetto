// The check on a weaker test file or limits file (package P36), as pure functions.
// Each function compares the text before and after a call and gives what got weaker, or undefined.
// A test file gets weaker when a test, an assert, or an `expect` is removed or changed.
// A limits file gets weaker when a bound changes value or goes away.
// A change of format, a rename, a move, and an added test or bound do not make a check weaker.

import {
  ASSERTION_START,
  BOUND_CODE_FILE,
  BOUND_DECLARATION,
  HASH_COMMENT_FILE,
  TEST_DECLARATION,
} from "../limits.ts";
import {
  missing,
  normal,
  statementAt,
  statements,
  uncommented,
} from "./scan.ts";
import { shown } from "./shown.ts";
import { flatten, readJson } from "./weak-json.ts";

/** The number of tests in `text`. A line is code text without its comment. */
const testCount = (text: string): number =>
  text
    .split("\n")
    .filter((line) => TEST_DECLARATION.some((re) => re.test(line))).length;

/**
 * What a call takes from a test file, or undefined.
 * A lost or changed assert counts, and so does a lower number of tests.
 */
export const testWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  const hash = HASH_COMMENT_FILE.test(rel);
  const [was, now] = [uncommented(before, hash), uncommented(after, hash)];
  const lost = missing(
    statements(was, ASSERTION_START),
    statements(now, ASSERTION_START),
  );
  if (lost[0] !== undefined)
    return `It removes or changes the assert \`${shown(lost[0])}\`.`;
  if (testCount(now) < testCount(was)) return "It removes a test.";
  return undefined;
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
