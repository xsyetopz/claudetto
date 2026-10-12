// The check on a weaker lint config, check runner config, or CI file (package P36), as pure functions.
// A lint config or a runner config gets weaker when a rule goes off or to a lower level,
// an ignore or exclude entry is added, a rule is removed, or a threshold gets lower.
// A CI file gets weaker when a job or a step is removed, a check command is removed,
// or `continue-on-error`, `|| true`, `if: false`, or a skip is added.
// A JSON config is compared by key (`json.ts`), and other text is compared by line (`weak-text.ts`).

import {
  HASH_COMMENT_FILE,
  PYPROJECT_SECTIONS,
  SETUP_CFG_SECTIONS,
} from "../../limits.ts";
import { sections } from "../content.ts";
import { isObj, jsonWeaker, readJson } from "./json.ts";
import { textWeaker } from "./text.ts";

/** The text of the sections of `text` that match `re`, for a TOML or INI file. */
const sectionText = (text: string, re: RegExp): string =>
  [...sections(text)]
    .filter(([name]) => re.test(name))
    .map(([, body]) => body)
    .join("");

/** What a call takes from a lint config or a check runner config at `rel`, or undefined. */
export const configWeaker = (
  rel: string,
  before: string,
  after: string,
): string | undefined => {
  const name = rel.split("/").at(-1) as string;
  const re =
    name === "pyproject.toml"
      ? PYPROJECT_SECTIONS
      : name === "setup.cfg"
        ? SETUP_CFG_SECTIONS
        : undefined;
  if (re)
    return textWeaker(sectionText(before, re), sectionText(after, re), true);
  const [was, now] = [readJson(before), readJson(after)];
  if (isObj(was) && isObj(now)) return jsonWeaker(was, now);
  return textWeaker(before, after, HASH_COMMENT_FILE.test(rel));
};

/** What a call takes from a CI file, or undefined. A CI file is YAML, or a `Jenkinsfile`, where a line is a step or a key. */
export const ciWeaker = (
  _rel: string,
  before: string,
  after: string,
): string | undefined => textWeaker(before, after, true);
