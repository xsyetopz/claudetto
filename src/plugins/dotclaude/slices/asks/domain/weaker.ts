// The ask before a change that makes a check weaker (package P36), as pure functions.
// A protected file is a test file, a limits file, a lint config, a runner config, a CI file, a hook file, or a settings file.
// For each kind, a function compares the text before and after a `Write`, `Edit`, or `MultiEdit` and gives what got weaker.
// A read never asks.
// A change to a protected file asks unless every changed part is on the safe list of its kind:
// a format change, a comment change, a move with the same content, or an added check.
// The safe list of each kind is in the file of its function.
// The call asks when a function cannot read the format, when an `old_string` is not in the text, or when the text is over `SCAN_MAX_CHARS`, so that an unknown change never passes.
// A `sed -i` of a protected file asks in `writes.ts`.
// A new file has no text before, so it adds checks and gets no ask.
// `ch` is the effect from `change` in `text.ts`.

import { CLAUDE_DIR } from "../../../../../kernel/paths.ts";
import { LIMIT_FILE_NAME, SCAN_MAX_CHARS } from "../limits.ts";
import { ciWeaker } from "./cidiff.ts";
import { hookFileWeaker, settingsWeaker } from "./hookdiff.ts";
import { UNREADABLE } from "./jsondiff.ts";
import { isTestPath, pathKind } from "./kinds.ts";
import { configWeaker } from "./lintdiff.ts";
import { limitsWeaker, testWeaker } from "./testdiff.ts";
import type { Change } from "./text.ts";

/** A kind of protected file: the label for the reason and the function that compares the text before and after. */
type Kind = {
  label: string;
  weaker: (rel: string, before: string, after: string) => string | undefined;
};

const LINT: Kind = { label: "a lint config file", weaker: configWeaker };
const BY_PATH_KIND: Record<string, Kind> = {
  "a lint config file": LINT,
  "a check runner config": {
    label: "a check runner config",
    weaker: configWeaker,
  },
  "a CI file": { label: "a CI file", weaker: ciWeaker },
  "a hook file": { label: "a hook file", weaker: hookFileWeaker },
};

/**
 * The kind of protected file that `rel` is, or undefined.
 * A test file comes before a limits file, and the kinds of `pathKind` come last.
 * `named` is true when a `hooks.json` names the file as a script.
 */
const kindOf = (rel: string, named: boolean): Kind | undefined => {
  const parts = rel.split("/");
  const name = parts.at(-1) as string;
  if (isTestPath(rel)) return { label: "a test file", weaker: testWeaker };
  if (LIMIT_FILE_NAME.test(name))
    return { label: "a limits file", weaker: limitsWeaker };
  if (parts.at(-2) === CLAUDE_DIR && /^settings.*\.json$/.test(name))
    return {
      label: "a settings file",
      weaker: (_rel, before, after) => settingsWeaker(before, after),
    };
  if (name === "pyproject.toml" || name === "setup.cfg") return LINT;
  const label = pathKind(rel, named);
  return label ? BY_PATH_KIND[label] : undefined;
};

/** The reason for a change of `rel` that makes a check weaker, as a list of at most one string. */
export const weakerReasons = (
  rel: string,
  ch: Change,
  named = false,
): string[] => {
  const kind = kindOf(rel, named);
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
