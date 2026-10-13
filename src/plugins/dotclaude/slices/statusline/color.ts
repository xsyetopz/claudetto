// The color of the status line: three steps for each percent, and `NO_COLOR`.
// `NO_COLOR` (no-color.org) turns off each color. The icons stay.

import { USAGE_LEVELS } from "../../../../kernel/budget.ts";
import { PROJECTED_RUNOUT, PROJECTED_WARN } from "./limits.ts";

/** A function that wraps text in a style. */
export type Style = (text: string) => string;

/** The styles of the status line. With no color, each style gives its text back. */
export type Paint = {
  readonly bold: Style;
  readonly dim: Style;
  readonly green: Style;
  readonly yellow: Style;
  readonly red: Style;
  /** The style of the step for `percent`: green below the first level, yellow below the second, and red from the second. */
  readonly level: (percent: number) => Style;
  /** The style of a limit whose use projects to `projected` percent at the end of its window: green below the warn level, yellow from it, and red above 100%. */
  readonly projected: (projected: number) => Style;
};

const wrap =
  (code: number): Style =>
  (text) =>
    `\u001b[${code}m${text}\u001b[0m`;

const plain: Style = (text) => text;

/** True when the environment asks for no color: `NO_COLOR` is set and not empty. */
export const colorOff = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

/** The styles for `color`. */
export const paintOf = (color: boolean): Paint => {
  const style = (code: number): Style => (color ? wrap(code) : plain);
  const green = style(32);
  const yellow = style(33);
  const red = style(31);
  const [warn, alarm] = USAGE_LEVELS;
  return {
    bold: style(1),
    dim: style(2),
    green,
    yellow,
    red,
    level: (percent) =>
      percent >= alarm ? red : percent >= warn ? yellow : green,
    projected: (projected) =>
      projected > PROJECTED_RUNOUT
        ? red
        : projected >= PROJECTED_WARN
          ? yellow
          : green,
  };
};
