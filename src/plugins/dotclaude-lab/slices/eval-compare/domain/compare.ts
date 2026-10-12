// The rules of `dotclaude-eval-compare` that need no process and no output.
// The adapter in `../adapters/eval-both.ts` runs the arguments and prints the lines.

/** The result of the two runs: the exit code and the lines to print after them. */
export type Verdict = { code: number; lines: string[] };

/** The eval options with the cost bound added when the caller sets none. */
export const withCostBound = (opts: string[]): string[] =>
  opts.some((o) => /^--max-cost-usd(?:=|$)/.test(o))
    ? opts
    : [...opts, "--max-cost-usd", "5"];

/**
 * The arguments of `claude` for the eval of one plugin folder.
 * It adds no `--scaffold` and no `--allow-tools`, because each one runs the code or the tools of the suite as the user.
 */
export const evalArgs = (plugin: string, opts: string[]): string[] => [
  "plugin",
  "eval",
  plugin,
  "--no-publish",
  ...withCostBound(opts),
];

/** The heading that the output shows before the run of one arm. */
export const armHeading = (arm: "A" | "B", folder: string): string =>
  `\n== Arm ${arm} (${folder})\n`;

/** The verdict of the two exit codes. Both must be `0` for the comparison. */
export const verdict = (x: number, y: number): Verdict => {
  if (x === 0 && y === 0)
    return {
      code: 0,
      lines: ["\nCompare the WITH column of the two tables."],
    };
  const arms: [string, number][] = [
    ["A", x],
    ["B", y],
  ];
  const failed = arms
    .filter(([, code]) => code !== 0)
    .map(([name, code]) => `Arm ${name} failed with exit code ${code}.`);
  return {
    code: 1,
    lines: [
      `\n${failed.join("\n")}\nTell the user, and do not compare the tables.`,
    ],
  };
};
