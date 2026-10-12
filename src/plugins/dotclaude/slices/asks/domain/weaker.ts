// The ask before a change that makes a check weaker (package P36), as pure functions.
// A protected file is a test file, a limits file, a lint config, a runner config, a CI file, a hook file, or a settings file.
// For each kind, a function compares the text before and after a `Write`, `Edit`, or `MultiEdit` and gives what got weaker.
// A change that keeps or adds checks gets no ask.
// The call asks when a function cannot read the format, or when the text is over `SCAN_MAX_CHARS`, so that an unknown change never passes.
// A new file has no text before, so it adds checks and gets no ask.
// `ch` is the effect from `change` in `text.ts`.

import { LIMIT_FILE_NAME, SCAN_MAX_CHARS } from "../limits.ts";
import { isTestPath } from "./kinds.ts";
import type { Change } from "./text.ts";
import { UNREADABLE } from "./weak-json.ts";
import { limitsWeaker, testWeaker } from "./weak-tests.ts";

/** A kind of protected file: the label for the reason and the function that compares the text before and after. */
type Kind = {
  label: string;
  weaker: (rel: string, before: string, after: string) => string | undefined;
};

/** The kind of protected file that `rel` is, or undefined. A test file comes before a limits file. */
const kindOf = (rel: string): Kind | undefined => {
  const name = rel.split("/").at(-1) as string;
  if (isTestPath(rel)) return { label: "a test file", weaker: testWeaker };
  if (LIMIT_FILE_NAME.test(name))
    return { label: "a limits file", weaker: limitsWeaker };
  return undefined;
};

/** The reason for a change of `rel` that makes a check weaker, as a list of at most one string. */
export const weakerReasons = (rel: string, ch: Change): string[] => {
  const kind = kindOf(rel);
  if (!kind || ch.before === null) return [];
  const found =
    ch.after === null ||
    ch.after.length > SCAN_MAX_CHARS ||
    ch.before.length > SCAN_MAX_CHARS
      ? UNREADABLE
      : kind.weaker(rel, ch.before, ch.after);
  if (found === undefined) return [];
  return [
    `The file \`${rel}\` is ${kind.label}.
This call can make a check weaker.
${found}
A change like this can hide the defect that the check exists to find.
To make a check pass, change the code and leave the check as it is.`,
  ];
};
