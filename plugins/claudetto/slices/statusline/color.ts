// The colors of the status line: one fixed palette, and `NO_COLOR` (design D15).
import { bandOf } from "../../kernel/budget.ts";

export const colorOff = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

type Style = (text: string) => string;

/** The styles of the palette, or the styles that add nothing for `false`. The usage gradient follows `bandOf`: green, amber, and red. */
export const paintOf = (color: boolean) => {
  const style =
    (parameters: string): Style =>
    (text) =>
      color ? `\u001b[${parameters}m${text}\u001b[0m` : text;
  const ok = style("38;2;78;186;101");
  const warn = style("38;2;255;193;7");
  const limit = style("38;2;255;107;128");
  const inactive = style("38;2;153;153;153");
  const bands = { green: ok, amber: warn, red: limit };
  const reviews: Readonly<Record<string, Style>> = {
    approved: ok,
    pending: warn,
    changes_requested: limit,
    draft: inactive,
  };
  return {
    bold: style("1"),
    dim: style("2"),
    ok,
    warn,
    limit,
    inactive,
    branch: style("38;2;175;135;255"),
    model: style("38;2;215;119;87"),
    level: (percent: number): Style => bands[bandOf(percent)],
    review: (state: unknown): Style => reviews[state as string] ?? warn,
  };
};

export type Paint = ReturnType<typeof paintOf>;
