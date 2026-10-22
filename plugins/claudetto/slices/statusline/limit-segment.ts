// The limit windows: `5h`, `7d`, and the spend limit.

import type { StatusSegment } from "../../kernel/slice.ts";
import { clock, type LimitWindow, paceOf, span } from "./format.ts";
import { ICON } from "./icons.ts";
import { ARROW_FIELD, PERCENT_FIELD, RUNOUT_FIELD } from "./limits.ts";
import type { Status } from "./types.ts";
import { width } from "./width.ts";

const fieldOf = (text: string, columns: number): string =>
  text + " ".repeat(Math.max(0, columns - width(text)));

/** The `▼13%` or `▲13%` text of the pace, or `""` when the pace has no delta. */
const arrowText = (delta: number, paint: Status["paint"]): string => {
  if (!delta) return "";
  return delta < 0
    ? paint.ok(`${ICON.reserve}${-delta}%`)
    : paint.warn(`${ICON.deficit}${delta}%`);
};

/** The `$used/$cap period` text of a spend limit, or `""` for a window with no spend. */
const moneyText = (window: LimitWindow, paint: Status["paint"]): string => {
  const { used_usd: usd, limit_usd: cap, period } = window;
  if (typeof usd !== "number" || typeof cap !== "number") return "";
  return paint.dim(
    `$${Math.round(usd)}/$${Math.round(cap)}${period ? ` ${period}` : ""}`,
  );
};

/** `◷ 5h 23% ▼13%  ↻1:50pm`, with the percent in the color of its projected use. Fixed fields align the windows of two rows, and `compact` has no padding. */
const limitText = (
  label: string,
  window: LimitWindow,
  spanS: number | null,
  { paint, now, compact }: Status,
): string => {
  const used = window.used_percentage;
  if (typeof used !== "number" || !Number.isFinite(used))
    return `${ICON.limit} ${label} ${paint.limit(ICON.error)}`;
  const percent = Math.round(used);
  const pace = spanS === null ? null : paceOf(window, now / 1000, spanS);
  const timeOf = (sec: number) =>
    compact ? span(sec * 1000 - now) : clock(sec, now);
  const arrow = arrowText(pace?.delta ?? 0, paint);
  const runOutAt = pace?.runOutAt ?? null;
  const runOut =
    runOutAt === null ? "" : paint.limit(`${ICON.runout}${timeOf(runOutAt)}`);
  const resetsAt = window.resets_at ?? 0;
  const reset =
    resetsAt * 1000 > now ? paint.dim(`${ICON.reset}${timeOf(resetsAt)}`) : "";
  const style = pace ? paint.projected(pace.projected) : paint.level(percent);
  const pad = compact ? "" : " ".repeat(PERCENT_FIELD - width(`${percent}%`));
  const head = `${ICON.limit} ${label} ${pad}${style(`${percent}%`)}`;
  const parts = compact
    ? [arrow, runOut]
    : [fieldOf(arrow, ARROW_FIELD), fieldOf(runOut, RUNOUT_FIELD)];
  return [head, moneyText(window, paint), ...parts, reset]
    .filter((part, i) => part || (!compact && i > 1))
    .join(" ")
    .trimEnd();
};

export const limit = (
  id: string,
  label: string,
  row: number,
  spanS: number | null,
  pick: (status: Status) => LimitWindow | null | undefined,
): StatusSegment => ({
  id,
  row,
  render: (raw) => {
    const window = pick(raw as Status);
    return window ? limitText(label, window, spanS, raw as Status) : null;
  },
});
