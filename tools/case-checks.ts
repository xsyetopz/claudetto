// The `just validate` rule of D25 for the eval cases: a case needs a check of a file or a tool call.
// A case whose checks all match the words of the reply (`regex` on the reply, or an `llm` judge) fails.
// A case also names its metric, bounds its tool calls and tokens, and fails on a recorded bad run (D25).
// The same rule for the wiki: a line that gives fewer than `EVAL_MIN_RUNS_PER_ARM` runs in an arm fails.

import { join } from "node:path";
import { parse } from "yaml";
import {
  EVAL_MAX_TOKENS,
  EVAL_MAX_TOOL_CALLS,
  EVAL_MIN_RUNS_PER_ARM,
} from "./limits.ts";
import {
  failedGraders,
  type Grader,
  graderFaults,
  runTokens,
  type Transcript,
  toolCalls,
} from "./transcript-grade.ts";

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

export type CaseDoc = {
  file: string;
  name: string;
  tags: string[];
  graders: Grader[];
};

/** The number in the tag `key:N`, or `undefined` when the tags have none. */
const tagNumber = (tags: string[], key: string): number | undefined => {
  const m = tags
    .map((t) => new RegExp(`^${key}:(\\d+)$`).exec(t))
    .find(Boolean);
  return m ? Number(m[1]) : undefined;
};

/** The faults of a live run against the tags `max-tool-calls:N` and `max-tokens:N` of its case. */
export const overBudget = (tags: string[], run: Transcript): string[] => {
  const out: string[] = [];
  const calls = tagNumber(tags, "max-tool-calls");
  if (calls !== undefined && toolCalls(run) > calls)
    out.push(`${toolCalls(run)} tool calls, over max-tool-calls:${calls}`);
  const max = tagNumber(tags, "max-tokens");
  const used = runTokens(run);
  if (max !== undefined && used !== undefined && used > max)
    out.push(`${used} tokens, over max-tokens:${max}`);
  return out;
};

/** An implementer case sits right under the `evals/` of a plugin, and a slice case sits under `slices/`. */
const isImplementer = (file: string): boolean =>
  /^src\/plugins\/[^/]+\/evals\/[^/]+\/case\.yaml$/.test(file);

/** A case of the `prompt` slice belongs to one set, named by its tag `set:NAME`. */
const isPrompt = (file: string): boolean =>
  /^src\/plugins\/[^/]+\/slices\/prompt\/evals\/[^/]+\/case\.yaml$/.test(file);

/** The sets of the `prompt` slice. The `blind` and `control` sets need a reference run. */
const SETS = ["baseline", "rule-aware", "blind", "control"];
const NEEDS_REFERENCE = ["blind", "control"];

/** The `Bash` `input_match` patterns of a case, from its `tool_used` graders and the `before` and `after` of its `tool_order` graders. */
const bashMatches = (graders: Grader[]): { name: string; match: string }[] =>
  graders.flatMap((g) => {
    const ends =
      g.type === "tool_order"
        ? [g.before, g.after].map((m) =>
            typeof m === "object" && m !== null
              ? m
              : { tool: m, input_match: undefined },
          )
        : [{ tool: g.tool, input_match: g.input_match }];
    return ends
      .filter((e) => e.tool === "Bash" && typeof e.input_match === "string")
      .map((e) => ({ name: g.name, match: e.input_match as string }));
  });

/** True when a pattern for the JSON of a `Bash` input starts at the `command` key, so that it cannot match the `description`. */
export const anchorsToCommand = (match: string): boolean =>
  /^(?:\^\\\{)?"command":"/.test(match);

/**
 * The faults of the cases against the rest of D25.
 * Each `Bash` `input_match` must start with `"command":"`, because the engine matches the JSON of the whole input and a `description` field sits next to `command`.
 * `badRuns` maps a case name to its recorded bad run, or to `undefined` when the case has none.
 * `references` maps a case name to its recorded reference run in the same way.
 * A case of the `prompt` slice needs exactly one tag `set:baseline`, `set:rule-aware`, `set:blind`, or `set:control`,
 * and a case of the `blind` or `control` set needs a reference run with events.
 * A case needs one metric tag (`pass^k` or `pass@1`), the tags `max-tool-calls:N` and `max-tokens:N` within the bounds of `limits.ts`,
 * and a bad run that has events, counts tokens, and fails the check without a model that its `fails` field names.
 * The implementer cases need a `split:dev` or `split:held-out` tag, and the set needs both splits.
 */
export const caseFaults = (
  cases: CaseDoc[],
  badRuns: Record<string, Transcript | undefined>,
  references: Record<string, Transcript | undefined> = {},
): string[] => {
  const out: string[] = [];
  for (const c of cases) {
    const bad = (why: string) => out.push(`${c.file}: ${why} (D25)`);
    const metrics = c.tags.filter((t) => t === "pass^k" || t === "pass@1");
    if (metrics.length !== 1)
      bad("needs exactly one tag, `pass^k` or `pass@1`");
    const calls = tagNumber(c.tags, "max-tool-calls");
    if (calls === undefined || calls < 1 || calls > EVAL_MAX_TOOL_CALLS)
      bad(
        `needs a tag \`max-tool-calls:N\` with N from 1 to ${EVAL_MAX_TOOL_CALLS}`,
      );
    const tokens = tagNumber(c.tags, "max-tokens");
    if (tokens === undefined || tokens < 1 || tokens > EVAL_MAX_TOKENS)
      bad(`needs a tag \`max-tokens:N\` with N from 1 to ${EVAL_MAX_TOKENS}`);
    if (isPrompt(c.file)) {
      const sets = c.tags.filter((t) =>
        new RegExp(`^set:(${SETS.join("|")})$`).test(t),
      );
      if (sets.length !== 1)
        bad(`needs exactly one tag \`set:${SETS.join("|")}\``);
      else if (
        NEEDS_REFERENCE.some((s) => sets[0] === `set:${s}`) &&
        !references[c.name]?.events.length
      )
        bad("is a `blind` or `control` case and has no reference run");
    }
    for (const { name, match } of bashMatches(c.graders))
      if (!anchorsToCommand(match))
        bad(
          `grader ${name}: a \`Bash\` \`input_match\` must start with \`"command":"\`, or it can match the \`description\` (${match})`,
        );
    const unmodelled = graderFaults(c.graders);
    for (const f of unmodelled) bad(f);
    const run = badRuns[c.name];
    if (!run) bad("has no recorded bad run");
    else {
      const target = c.graders.find((g) => g.name === run.fails);
      if (run.events.length === 0) bad("has an empty bad run");
      else if (!run.fails) bad("has a bad run that names no `fails` grader");
      else if (!target || target.type === "llm")
        bad(
          `has a bad run whose \`fails\` grader ${run.fails} is no check without a model`,
        );
      else if (unmodelled.length)
        bad("has graders that the offline check cannot run");
      else if (!failedGraders(c.graders, run).includes(run.fails))
        bad(`passes its bad run at the grader ${run.fails}`);
      if (run.events.length && runTokens(run) === undefined)
        bad("has a bad run with no `usage` in its `result` event");
    }
    if (
      isImplementer(c.file) &&
      !c.tags.some((t) => /^split:(dev|held-out)$/.test(t))
    )
      bad(
        "is an implementer case and needs a tag `split:dev` or `split:held-out`",
      );
  }
  const impl = cases.filter((c) => isImplementer(c.file));
  for (const split of ["dev", "held-out"])
    if (impl.length && !impl.some((c) => c.tags.includes(`split:${split}`)))
      out.push(`the implementer cases have no \`split:${split}\` case (D25)`);
  return out;
};

/** The faults of `caseFaults` for the cases under `root`, with the bad runs in `tests/<plugin>/evals/bad-runs/<name>.json` and the reference runs in `reference-runs/<name>.json`. */
export const caseFaultsIn = async (
  root: string,
  glob: string = CASES,
): Promise<string[]> => {
  const cases: CaseDoc[] = [];
  const badRuns: Record<string, Transcript | undefined> = {};
  const references: Record<string, Transcript | undefined> = {};
  for await (const f of new Bun.Glob(glob).scan(root)) {
    const doc = parse(await Bun.file(join(root, f)).text());
    const name: string = doc?.name ?? f;
    cases.push({
      file: f,
      name,
      tags: doc?.tags ?? [],
      graders: doc?.graders ?? [],
    });
    const plugin = f.split("/")[2];
    const bad = Bun.file(
      join(root, "tests", plugin ?? "", "evals", "bad-runs", `${name}.json`),
    );
    badRuns[name] = (await bad.exists()) ? await bad.json() : undefined;
    const ref = Bun.file(
      join(
        root,
        "tests",
        plugin ?? "",
        "evals",
        "reference-runs",
        `${name}.json`,
      ),
    );
    references[name] = (await ref.exists()) ? await ref.json() : undefined;
  }
  return caseFaults(
    cases.sort((a, b) => a.file.localeCompare(b.file)),
    badRuns,
    references,
  );
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
