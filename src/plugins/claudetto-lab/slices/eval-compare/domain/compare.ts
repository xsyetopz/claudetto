export type Verdict = { code: number; lines: string[] };

export type Arm = { code: number; result: string | null };

export const withCostBound = (opts: string[]): string[] =>
  opts.some((o) => /^--max-cost-usd(?:=|$)/.test(o))
    ? opts
    : [...opts, "--max-cost-usd", "5"];

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

export const armHeading = (arm: "A" | "B", folder: string): string =>
  `\n== Arm ${arm} (${folder})\n`;

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

const MAX_SCORE = 1;

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
