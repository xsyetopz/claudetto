// The rules of `claudetto-eval-compare` that need no process and no output.
// The adapter in `../adapters/eval-both.ts` runs the arguments and prints the lines.

/** The result of the two runs: the exit code and the lines to print after them. */
export type Verdict = { code: number; lines: string[] };

/** What one arm gave: the exit code of its run, and the text of its `--json` file or `null` when the file is absent. */
export type Arm = { code: number; result: string | null };

/** The eval options with the cost bound added when the caller sets none. */
export const withCostBound = (opts: string[]): string[] =>
  opts.some((o) => /^--max-cost-usd(?:=|$)/.test(o))
    ? opts
    : [...opts, "--max-cost-usd", "5"];

/**
 * The arguments of `claude` for the eval of one plugin folder.
 * It adds no `--scaffold` and no `--allow-tools`, because each one runs the code or the tools of the suite as the user.
 * `--json FILE` is last, because it takes the words after it as its value.
 */
export const evalArgs = (
  plugin: string,
  opts: string[],
  json: string,
): string[] => [
  "plugin",
  "eval",
  plugin,
  "--no-publish",
  ...withCostBound(opts),
  "--json",
  json,
];

/** The heading that the output shows before the run of one arm. */
export const armHeading = (arm: "A" | "B", folder: string): string =>
  `\n== Arm ${arm} (${folder})\n`;

// The `problem` codes of `suite.plugins` that say the plugin did not load.
const NOT_LOADED = new Set([
  "manifest_invalid",
  "disabled_by_default",
  "will_not_load",
]);

type Doc = {
  partial?: unknown;
  suite?: { plugins?: { name?: unknown; problem?: unknown }[] };
  cases?: { aggregates?: { score?: unknown; scoreWithout?: unknown } }[];
};

/** The highest score of a case. A baseline at this score leaves no room for a gain. */
const MAX_SCORE = 1;

/**
 * The reason that the `--json` result of an arm is not valid, or `null` when it is valid.
 * A result is valid when it has at least one case, each case has a finite score, the run is not partial,
 * and the plugin loaded.
 */
export const armProblem = (result: string | null): string | null => {
  if (result === null) return "it wrote no result file";
  let doc: Doc;
  try {
    doc = JSON.parse(result) as Doc;
  } catch {
    return "its result file is not JSON";
  }
  if (doc === null || typeof doc !== "object")
    return "its result file is not an object";
  if (!Array.isArray(doc.cases) || doc.cases.length === 0)
    return "its result has no case";
  if (
    doc.cases.some(
      (c) => !Number.isFinite(c?.aggregates?.score as number | undefined),
    )
  )
    return "a case in its result has no score";
  if (doc.partial === true) return "its run is partial";
  const plugins = doc.suite?.plugins;
  if (Array.isArray(plugins)) {
    if (plugins.length === 0) return "no plugin loaded";
    const bad = plugins.find((p) => NOT_LOADED.has(String(p?.problem)));
    if (bad)
      return `the plugin ${String(bad.name)} did not load (${String(bad.problem)})`;
  }
  return null;
};

/**
 * The reason that the baseline of an arm cannot show a gain, or `null` when it can.
 * The baseline is the `scoreWithout` of each case, which is the score with no plugin.
 * A gain needs at least one case where the baseline scores below the maximum.
 */
export const baselineProblem = (result: string | null): string | null => {
  if (result === null) return null;
  const cases = (JSON.parse(result) as Doc).cases ?? [];
  const scores = cases.map((c) => c.aggregates?.scoreWithout);
  if (!scores.every((s) => Number.isFinite(s as number | undefined)))
    return "a case in its result has no baseline score";
  if ((scores as number[]).every((s) => s >= MAX_SCORE))
    return "its baseline is at the maximum, so no gain can show";
  return null;
};

/**
 * The verdict of the two arms. Both exit codes must be `0` and both results valid.
 * A run that exits with `0` and has no valid result still fails the comparison.
 * An arm whose baseline scores the maximum on each case fails it too, because no gain shows.
 */
export const verdict = (x: Arm, y: Arm): Verdict => {
  const failed = (
    [
      ["A", x],
      ["B", y],
    ] as const
  ).flatMap(([name, arm]) => {
    if (arm.code !== 0)
      return [`Arm ${name} failed with exit code ${arm.code}.`];
    const problem = armProblem(arm.result);
    if (problem) return [`Arm ${name} has no valid result: ${problem}.`];
    const base = baselineProblem(arm.result);
    return base ? [`Arm ${name} has no usable baseline: ${base}.`] : [];
  });
  if (failed.length === 0)
    return {
      code: 0,
      lines: ["\nCompare the WITH column of the two tables."],
    };
  return {
    code: 1,
    lines: [
      `\n${failed.join("\n")}\nTell the user, and do not compare the tables.`,
    ],
  };
};
