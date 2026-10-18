// The `just validate` rule of D25 for the eval cases: a case needs a check of a file or a tool call.
// A case whose checks all match the words of the reply (`regex` on the reply, or an `llm` judge) fails.

import { join } from "node:path";
import { parse } from "yaml";

export type EvalCase = {
  file: string;
  graders: { type?: string; target?: { source?: string } }[];
};

const CASES = "src/plugins/**/evals/*/case.yaml";

/** True when a grader checks a file or a tool call, and not the words of the reply. */
const checksWork = (g: EvalCase["graders"][number]): boolean =>
  g.type === "tool_used" || g.target?.source === "file";

/** The files of the cases that have no check of a file or a tool call. */
export const replyOnlyCases = (cases: EvalCase[]): string[] =>
  cases.filter((c) => !c.graders.some(checksWork)).map((c) => c.file);

/** The case files under `root` that match `glob` and have no check of a file or a tool call. */
export const replyOnlyCasesIn = async (
  root: string,
  glob: string = CASES,
): Promise<string[]> => {
  const cases: EvalCase[] = [];
  for await (const f of new Bun.Glob(glob).scan(root)) {
    const doc = parse(await Bun.file(join(root, f)).text());
    cases.push({ file: f, graders: doc?.graders ?? [] });
  }
  return replyOnlyCases(cases.sort((a, b) => a.file.localeCompare(b.file)));
};
