// Shared helpers of `graders*.test.ts`: the cases of `plugins/claudetto/evals/*/case.yaml` and the grader lookups.

import { expect } from "bun:test";
import path from "node:path";
import { parse } from "yaml";
import { PLUGINS, walk } from "../../../support/repo.ts";

export const EVALS = path.join(PLUGINS, "claudetto/evals");

/** A grader of a case file, as the YAML holds it. */
export type Grader = {
  name: string;
  type: string;
  target?: string | { source: string; path: string };
  pattern?: string;
  flags?: string;
  match?: string;
  focus?: string;
  criteria?: string;
  tool?: string;
  input_match?: string;
  max?: number;
};
/** A case file, as the YAML holds it, and `dir`, its folder, whose name can differ from `name`. */
export type Case = { name: string; graders: Grader[]; dir: string };

export const cases: Record<string, Case> = Object.fromEntries(
  await Promise.all(
    walk(EVALS, { keep: (f) => path.basename(f) === "case.yaml" }).map(
      async (file) => {
        const doc = parse(await Bun.file(file).text()) as Case;
        return [doc.name, { ...doc, dir: path.dirname(file) }] as const;
      },
    ),
  ),
);

/** The folder of the case `caseName`. */
export const dirOf = (caseName: string): string =>
  (cases[caseName] as Case).dir;

/** The grader `name` of the case `caseName`. */
export const grader = (caseName: string, name: string): Grader => {
  const found = cases[caseName]?.graders.find((g) => g.name === name);
  expect(found, `${caseName}: no grader ${name}`).toBeTruthy();
  return found as Grader;
};
/** The regex of a `regex` grader or the `input_match` of a `tool_used` grader. */
export const regexOf = (g: Grader) =>
  new RegExp((g.pattern ?? g.input_match) as string, g.flags ?? "");
/** Whether the grader passes `text`: a `not_contains` grader passes when the regex finds nothing. */
export const passes = (g: Grader, text: string) =>
  regexOf(g).test(text) !== (g.match === "not_contains");
/** A `Bash` call as the engine matches it: the JSON of the input, with `command` first and then the `description` that most calls carry. */
export const asJson = (command: string, description = "Run the step") =>
  JSON.stringify({ command, description });
