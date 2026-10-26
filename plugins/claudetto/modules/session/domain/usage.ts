// The usage value of `$.state` that `prompt` keeps from `session.measure` and `handoff` reads for the cost report (design D25).
// A `$.state` ref must be a literal in the file that uses it, so each adapter holds `{ plugin: "claudetto", key: "usage" }`.
// `costReport` is the cost report of spec `usage-awareness` ("Cost Report"): the handoff and the cost line of a ticked box use it.

import type { Band } from "../limits.ts";

/** The rate-limit windows that carry a share: the 5-hour window and the weekly window. A gateway `spend_limit` has no band. */
export const WINDOWS = ["five_hour", "seven_day"] as const;
export type Window = (typeof WINDOWS)[number];

/** The percent used of each window that has a reading. */
export type Shares = Readonly<Partial<Record<Window, number>>>;

/** `bands` are the last band of each window, `start` the first share of each window, and `line` the usage line that waits for the next request. */
export type Usage = {
  readonly bands: Readonly<Partial<Record<Window, Band>>>;
  readonly start: Shares;
  readonly line?: string;
};

/** The shares of the windows in `limits`. A window with no entry has no share. */
export const sharesOf = (
  limits: readonly { kind: string; percentUsed: number }[],
): Shares =>
  Object.fromEntries(
    WINDOWS.flatMap((kind) => {
      const found = limits.find((limit) => limit.kind === kind);
      return found === undefined ? [] : [[kind, found.percentUsed]];
    }),
  );

/** The window names as the model reads them. */
export const WINDOW_NAMES: Readonly<Record<Window, string>> = {
  five_hour: "5-hour",
  seven_day: "weekly",
};

const COST = (v: { cost: string }): string =>
  `Cost of the session so far: ${v.cost}.`;

const SHARES = (v: { changes: string }): string =>
  `Change of each plan share since the first reading: ${v.changes}.`;

/** The change as the model reads it, such as `+11%`. */
const change = (now: number, start: number): string => {
  const diff = Number((now - start).toFixed(1));
  return `${diff >= 0 ? "+" : ""}${diff}%`;
};

/**
 * The cost and the change of each share, or `none` when there is neither.
 * An API key has no shares, so only the cost shows. `start` holds the first share of each window.
 */
export const costReport = (
  usd: number | undefined,
  now: Shares,
  start: Shares,
): string => {
  const changes = WINDOWS.flatMap((w) => {
    const [at, from] = [now[w], start[w]];
    return at === undefined || from === undefined
      ? []
      : [`${WINDOW_NAMES[w]} ${change(at, from)}`];
  });
  const parts = [
    ...(usd === undefined ? [] : [COST({ cost: `$${usd.toFixed(2)}` })]),
    ...(changes.length === 0 ? [] : [SHARES({ changes: changes.join(", ") })]),
  ];
  return parts.length === 0 ? "none" : parts.join(" ");
};

/** The cost report of the session from the reads of `$.session.usage()` and of the usage value of `$.state`, or `none` for a fault of a read. The caller gives each read as a port, because the mod runtime follows `$` into no imported arrow function. */
export const sessionCost = async (io: {
  usage: () => Promise<{
    cost?: { usd?: number } | undefined;
    rateLimits: readonly { kind: string; percentUsed: number }[];
  }>;
  state: () => Promise<{ value?: Partial<Usage> | undefined }>;
}): Promise<string> => {
  try {
    const [usage, { value }] = await Promise.all([io.usage(), io.state()]);
    return costReport(
      usage.cost?.usd,
      sharesOf(usage.rateLimits),
      value?.start ?? {},
    );
  } catch {
    return "none";
  }
};
