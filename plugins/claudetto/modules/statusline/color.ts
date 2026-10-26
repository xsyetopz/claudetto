// The colors of the status line: one fixed palette, a usage gradient between 3 stops, and `NO_COLOR` (design D15).
import {
  GRADIENT_AMBER_PERCENT,
  GRADIENT_GREEN_PERCENT,
  GRADIENT_RED_PERCENT,
} from "./limits.ts";

export const colorOff = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

type Style = (text: string) => string;
type Rgb = readonly [number, number, number];

const GREEN: Rgb = [78, 186, 101];
const AMBER: Rgb = [255, 193, 7];
const RED: Rgb = [255, 107, 128];

/** The color `at` of the way from `from` to `to`, with `at` held between 0 and 1. */
const mix = (from: Rgb, to: Rgb, at: number): Rgb => {
  const t = Math.min(1, Math.max(0, at));
  return from.map((c, i) => Math.round(c + ((to[i] as number) - c) * t)) as [
    number,
    number,
    number,
  ];
};

const gradient = (percent: number): Rgb =>
  percent <= GRADIENT_AMBER_PERCENT
    ? mix(
        GREEN,
        AMBER,
        (percent - GRADIENT_GREEN_PERCENT) /
          (GRADIENT_AMBER_PERCENT - GRADIENT_GREEN_PERCENT),
      )
    : mix(
        AMBER,
        RED,
        (percent - GRADIENT_AMBER_PERCENT) /
          (GRADIENT_RED_PERCENT - GRADIENT_AMBER_PERCENT),
      );

/** The styles of the palette, or the styles that add nothing for `false`. */
export const paintOf = (color: boolean) => {
  const style =
    (parameters: string): Style =>
    (text) =>
      color ? `\u001b[${parameters}m${text}\u001b[0m` : text;
  const rgb = (c: Rgb) => style(`38;2;${c.join(";")}`);
  const [ok, warn, limit] = [rgb(GREEN), rgb(AMBER), rgb(RED)];
  const inactive = style("38;2;153;153;153");
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
    /** The usage gradient at `percent`. */
    level: (percent: number): Style => rgb(gradient(percent)),
    /** Amber at 1 and red at 0, for the time left to a run-out as a part of the time left to the reset. */
    runout: (left: number): Style => rgb(mix(RED, AMBER, left)),
    review: (state: unknown): Style => reviews[state as string] ?? warn,
  };
};

export type Paint = ReturnType<typeof paintOf>;
