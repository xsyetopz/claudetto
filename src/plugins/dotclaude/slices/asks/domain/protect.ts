// The ask before a change to a line of a test file or a limits file, as a pure function.
// `ch` is the effect from `change` in `text.ts`.

import { LIMIT_FILE_NAME } from "../limits.ts";
import { isTestPath, shown } from "./kinds.ts";
import type { Change } from "./text.ts";
import { added, lostLines } from "./text.ts";

/** True when a lost line of a limits file holds a number or a `const` declaration. Comment lines do not count. */
const limitLine = (line: string): boolean =>
  !/^\s*(?:\/\/|\/\*|\*)/.test(line) &&
  (/\d/.test(line) || /^\s*(?:export\s+)?const\b/.test(line));

/**
 * The reason to ask before a change of `rel`, or undefined.
 * A test file is `*.test.*`, `*.spec.*`, `*_test.*`, `*_spec.*`, `test_*.py`, or a file in a `test`, `tests`, `Tests`, or `__tests__` folder (see `isTestPath`).
 * A limits file is `limits.*` or `budget.*`.
 * `ch` is the effect from `change`. Only a call that changes or removes an existing line of a test file asks.
 * For a limits file, only a changed or removed line with a number or a `const` declaration asks.
 * A call that only adds lines, and a call that does not apply to the file, get no ask.
 */
export const protectedReason = (
  rel: string,
  ch: Change,
): string | undefined => {
  const name = rel.split("/").at(-1) as string;
  const isTest = isTestPath(rel);
  const isLimit = LIMIT_FILE_NAME.test(name);
  if ((!isTest && !isLimit) || ch.before === null || ch.after === null)
    return undefined;
  const lost = lostLines(ch.before, ch.after).filter((l) => l.trim() !== "");
  const hit = lost.find((l) => isTest || limitLine(l));
  if (hit === undefined) return undefined;
  const now = added((t) => t.split("\n"), ch).find((l) => l.trim() !== "");
  const change = now === undefined ? "removes it" : `writes \`${shown(now)}\``;
  return `The file \`${rel}\` is ${isTest ? "a test" : "a limits"} file.
This call changes or removes the existing line \`${shown(hit)}\` and ${change}.
A change to a test or a limit can hide the defect that the check exists to find.
To make a check pass, change the code and leave the check as it is.`;
};
