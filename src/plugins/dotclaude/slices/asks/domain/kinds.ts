// The ask for a change that can hide a defect (decision H5), as pure functions.
// The kinds are a lint config, a check runner config, a CI file, a hook file, a settings file, a check script or recipe,
// a skipped or focused test, and a lint suppression.
// The file lists are in `limits.ts`. `ch` is the effect from `change` in `text.ts`.

import {
  CI_FOLDERS,
  CI_GITHUB_PATHS,
  CI_NAMES,
  CODE_EXTENSIONS,
  DATA_EXTENSIONS,
  HOOK_PATHS,
  LINT_CONFIG_NAMES,
  RUNNER_CONFIG_NAMES,
  RUST_IGNORE,
  SKIPPED_TEST,
  SUPPRESSION,
  SUPPRESSION_ATTRIBUTE,
  TEST_FOLDER,
  TEST_NAMES,
  TEST_SUFFIX_NAME,
} from "../limits.ts";
import { codePart, commentPart } from "./comments.ts";
import { contentKind } from "./content.ts";
import { shown } from "./shown.ts";
import type { Change } from "./text.ts";
import { added } from "./text.ts";

/** True when `rel` is a test file: `*.test.*`, `*.spec.*`, `*_test.*`, `*_spec.*`, `test_*.py`, or a file in a `test`, `tests`, `Tests`, or `__tests__` folder. */
export const isTestPath = (rel: string): boolean => {
  const parts = rel.split("/");
  const name = parts[parts.length - 1] as string;
  return (
    TEST_NAMES.some((re) => re.test(name)) ||
    (TEST_SUFFIX_NAME.test(name) && !DATA_EXTENSIONS.test(name)) ||
    parts.slice(0, -1).some((p) => TEST_FOLDER.test(p))
  );
};

/**
 * The kind of file that a call needs an ask for, from the path alone: a label, or undefined.
 * `named` is true when a `hooks.json` names the file as a script (see `hookscripts.ts`).
 */
export const pathKind = (rel: string, named = false): string | undefined => {
  const parts = rel.split("/");
  const name = parts[parts.length - 1] as string;
  if (LINT_CONFIG_NAMES.some((re) => re.test(name)))
    return "a lint config file";
  if (RUNNER_CONFIG_NAMES.some((re) => re.test(name)))
    return "a check runner config";
  if (
    parts.slice(0, -1).some((p) => CI_FOLDERS.includes(p)) ||
    CI_GITHUB_PATHS.some((re) => re.test(rel)) ||
    CI_NAMES.some((re) => re.test(name))
  )
    return "a CI file";
  if (named || HOOK_PATHS.some((re) => re.test(rel))) return "a hook file";
  return undefined;
};

/** The lines of `text` where a pattern of `res` matches the part that `pick` gives, each in full. */
const hitLines =
  (res: RegExp[], pick: (line: string) => string) =>
  (text: string): string[] =>
    text.split("\n").filter((line) => res.some((re) => re.test(pick(line))));

/** What a change of a kind of file puts at risk, for the reason that the user reads. */
const RISK: Record<string, string> = {
  "a hook file": "A change to it changes which checks run.",
  "a settings file":
    "A change to it changes which calls run without an ask, or which checks run.",
};
const WHY = "Such a change can hide a defect that a check exists to find.";

/** What a change of the kind `label` puts at risk. */
export const riskOf = (label: string): string => RISK[label] ?? WHY;

const FINDING = (
  rel: string,
  label: string,
): string => `The file \`${rel}\` is ${label}.
This call changes it.
${riskOf(label)}`;

/** The reasons to ask for a change of `rel` from the path alone, so that a text over the scan bound gets them too. */
export const pathReasons = (rel: string, named = false): string[] => {
  const kind = pathKind(rel, named);
  return kind ? [FINDING(rel, kind)] : [];
};

/**
 * The reasons to ask before a change of `rel` from the text: a list of strings, empty when none.
 * A settings file, a tool config, a check script, and a check recipe ask for a changed value.
 */
export const contentReasons = (rel: string, ch: Change): string[] => {
  const kind = contentKind(rel, rel.split("/").at(-1) as string, ch);
  return [...(kind ? [FINDING(rel, kind)] : []), ...skipReasons(rel, ch)];
};

/**
 * The reasons to ask before a call adds a skipped or focused test or a lint suppression to `rel`.
 * Each ask is for added text only, and each check works one line at a time, so it needs no scan of the whole text.
 * A skipped test counts only in code, and a suppression counts only in a comment.
 * An attribute suppression counts in code, and an ignored Rust test counts in a `.rs` file at any path.
 */
export const skipReasons = (rel: string, ch: Change): string[] => {
  const out: string[] = [];
  const rust = rel.endsWith(".rs");
  const tests = isTestPath(rel);
  const finds: RegExp[] = [
    ...(tests ? SKIPPED_TEST : []),
    ...(rust ? RUST_IGNORE : []),
  ];
  const [skip] = finds.length ? added(hitLines(finds, codePart), ch) : [];
  if (skip !== undefined)
    out.push(`The file \`${rel}\` is ${tests ? "a test file" : "a Rust file"}.
This call adds the skipped or focused test \`${shown(skip)}\`.
${WHY}`);
  if (CODE_EXTENSIONS.test(rel)) {
    const [mute] = added(
      (text) => [
        ...hitLines(SUPPRESSION, commentPart)(text),
        ...hitLines(SUPPRESSION_ATTRIBUTE, codePart)(text),
      ],
      ch,
    );
    if (mute !== undefined)
      out.push(`The file \`${rel}\` is a code file.
This call adds the lint suppression \`${shown(mute)}\`.
${WHY}`);
  }
  return out;
};
