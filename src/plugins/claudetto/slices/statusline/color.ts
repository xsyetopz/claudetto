// The colors of the status line, from the built-in themes of Claude Code 2.1.301, and `NO_COLOR`.
// A role takes the color of one theme key: `ok` is `success`, `warn` is `warning`, `limit` is `error`, `branch` is `merged`, and `model` is `claude`.

import { USAGE_LEVELS } from "../../../../kernel/budget.ts";
import { PROJECTED_RUNOUT, PROJECTED_WARN } from "./limits.ts";

const ROLES = ["ok", "warn", "limit", "inactive", "branch", "model"] as const;
export type Theme = Readonly<Record<(typeof ROLES)[number], string>>;

const ANSI = [32, 33, 31, 90, 35, 91];

// In the order of `ROLES`. A number below 256 is an SGR code, and any other number is a 24-bit color.
const THEMES: Readonly<Record<string, number[]>> = {
  light: [0x2c7a39, 0x966c1e, 0xab2b3f, 0x666666, 0x8700ff, 0xd77757],
  dark: [0x4eba65, 0xffc107, 0xff6b80, 0x999999, 0xaf87ff, 0xd77757],
  "light-daltonized": [
    0x006699, 0xff9900, 0xcc0000, 0x666666, 0x8700ff, 0xff9933,
  ],
  "dark-daltonized": [
    0x3399ff, 0xffcc00, 0xff6666, 0x999999, 0xaf87ff, 0xff9933,
  ],
  "light-ansi": ANSI,
  "dark-ansi": ANSI,
};

/** A name that is not a built-in theme, such as `auto` or `custom:x`, gives `dark`. */
export const themeOf = (name: string | null): Theme => {
  const codes = THEMES[name ?? ""] ?? (THEMES["dark"] as number[]);
  return Object.fromEntries(
    ROLES.map((role, i) => {
      const c = codes[i] as number;
      return [
        role,
        c < 256 ? String(c) : `38;2;${c >> 16};${(c >> 8) & 255};${c & 255}`,
      ];
    }),
  ) as Theme;
};

/** True when `NO_COLOR` is set and not empty. */
export const colorOff = (
  env: Readonly<Record<string, string | undefined>>,
): boolean => (env["NO_COLOR"] ?? "") !== "";

type Style = (text: string) => string;

/** The styles for `theme`, or the styles that add nothing for `null`. */
export const paintOf = (theme: Theme | null) => {
  const style =
    (parameters: string | undefined): Style =>
    (text) =>
      theme === null || parameters === undefined
        ? text
        : `\u001b[${parameters}m${text}\u001b[0m`;
  const [ok, warn, limit, inactive] = ROLES.slice(0, 4).map((r) =>
    style(theme?.[r]),
  ) as [Style, Style, Style, Style];
  const [warnAt, alarmAt] = USAGE_LEVELS;
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
    branch: style(theme?.branch),
    model: style(theme?.model),
    level: (percent: number): Style =>
      percent >= alarmAt ? limit : percent >= warnAt ? warn : ok,
    /** Limit above 100% projected use (a run-out), warning from the warn level. */
    projected: (projected: number): Style =>
      projected > PROJECTED_RUNOUT
        ? limit
        : projected >= PROJECTED_WARN
          ? warn
          : ok,
    /** A review state that is not known has the style of `pending`. */
    review: (state: unknown): Style => reviews[state as string] ?? warn,
  };
};

export type Paint = ReturnType<typeof paintOf>;
