// The `just validate` rule of D25 for the eval cases: a case needs a check of a file or a tool call.
// A case whose checks all match the words of the reply (`regex` on the reply, or an `llm` judge) fails.
// The same rule for the wiki: a line that gives fewer than `EVAL_MIN_RUNS_PER_ARM` runs in an arm fails.

import { join } from "node:path";
import { parse } from "yaml";
import { EVAL_MIN_RUNS_PER_ARM } from "./limits.ts";

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

const NUMBER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

/**
 * A run count of an arm, as the wiki writes it: `3 runs per arm`, `10 trials per arm`, or `three runs each`.
 * The count must come before `runs` or `trials`, so a table of bounds (`| runs | 3 for each arm |`) does not match.
 */
const RUN_COUNT = new RegExp(
  `\\b(\\d+|${NUMBER_WORDS.join("|")})\\s+(?:runs?|trials?)\\s+(?:each|per arm|for each arm|in each arm)\\b`,
  "gi",
);

export type ThinClaim = { file: string; line: number; runs: number };

/** The lines of the pages that give a run count below `EVAL_MIN_RUNS_PER_ARM` for an arm. */
export const thinEvalClaims = (
  pages: { file: string; text: string }[],
): ThinClaim[] =>
  pages.flatMap(({ file, text }) =>
    text.split("\n").flatMap((line, i) =>
      [...line.matchAll(RUN_COUNT)]
        .map((m) => {
          const w = (m[1] ?? "").toLowerCase();
          const idx = NUMBER_WORDS.indexOf(w);
          return idx >= 0 ? idx + 1 : Number(w);
        })
        .filter((runs) => runs < EVAL_MIN_RUNS_PER_ARM)
        .map((runs) => ({ file, line: i + 1, runs })),
    ),
  );

/** The thin claims of the wiki source under `root`, in `src/wiki/`. */
export const thinEvalClaimsIn = async (
  root: string,
  glob = "src/wiki/**/*.md",
): Promise<ThinClaim[]> => {
  const pages: { file: string; text: string }[] = [];
  for await (const f of new Bun.Glob(glob).scan(root))
    pages.push({ file: f, text: await Bun.file(join(root, f)).text() });
  return thinEvalClaims(pages.sort((a, b) => a.file.localeCompare(b.file)));
};
