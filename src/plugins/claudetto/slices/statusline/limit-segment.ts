// The segments of the limit windows of the status line: `5h`, `7d`, and the spend limit.
// Each value is a percent with an icon, and the percent has the color of its projected use.

import type { StatusSegment } from "../../../../kernel/slice.ts";
import { clock, span } from "./domain/format.ts";
import { paceOf } from "./domain/pace.ts";
import type { LimitWindow, Status } from "./domain/types.ts";
import { ICON } from "./icons.ts";
import { ARROW_FIELD, PERCENT_FIELD, RUNOUT_FIELD } from "./limits.ts";
import { width } from "./width.ts";

/** The status object that Claude Code gave, as the segments read it. */
export const asStatus = (status: unknown): Status => status as Status;

/** The pace arrow: `▼14%` in the normal color for a reserve, `▲12%` in the warning color for a deficit, and nothing at the even pace. */
const arrowText = (delta: number | null, status: Status): string => {
  if (delta === null || delta === 0) return "";
  return delta < 0
    ? status.paint.ok(`${ICON.reserve}${-delta}%`)
    : status.paint.warn(`${ICON.deficit}${delta}%`);
};

/** A time of a window: the clock, or with `compact`, the countdown from `now`. */
const timeOf = (sec: number, status: Status): string =>
  status.compact ? span(sec * 1000 - status.now) : clock(sec, status.now);

/** The text padded with spaces on the right to `columns`, so that a field keeps its column. */
const fieldOf = (text: string, columns: number): string =>
  text + " ".repeat(Math.max(0, columns - width(text)));

/**
 * One limit window as `◷ 5h 23% ▼13%  ↻1:50pm`.
 * The percent has the color of its projected use, or of its raw use before the pace shows.
 * The arrow, the run-out time, and the reset fill fixed fields, so the windows of two rows align field by field.
 * A window whose `used_percentage` is not a number shows the error mark in place of the percent.
 */
const limitText = (
  label: string,
  window: LimitWindow,
  spanS: number | null,
  status: Status,
): string => {
  const used = window.used_percentage;
  if (typeof used !== "number" || !Number.isFinite(used))
    return `${ICON.limit} ${label} ${status.paint.limit(ICON.error)}`;
  const percent = Math.round(used);
  const pace = spanS === null ? null : paceOf(window, status.now / 1000, spanS);
  const style = pace
    ? status.paint.projected(pace.projected)
    : status.paint.level(percent);
  const figure = style(`${percent}%`);
  const runOutAt = pace?.runOutAt ?? null;
  const runOut =
    runOutAt === null
      ? ""
      : status.paint.limit(`${ICON.runout}${timeOf(runOutAt, status)}`);
  const resetsAt = window.resets_at ?? 0;
  const reset =
    resetsAt * 1000 > status.now
      ? status.paint.dim(`${ICON.reset}${timeOf(resetsAt, status)}`)
      : "";
  const pad = status.compact
    ? ""
    : " ".repeat(PERCENT_FIELD - width(`${percent}%`));
  const head = `${ICON.limit} ${label} ${pad}${figure}`;
  const arrow = arrowText(pace?.delta ?? null, status);
  if (status.compact)
    return [head, arrow, runOut, reset].filter(Boolean).join(" ");
  return [
    head,
    fieldOf(arrow, ARROW_FIELD),
    fieldOf(runOut, RUNOUT_FIELD),
    reset,
  ]
    .join(" ")
    .trimEnd();
};

/** The segment of one limit window. A window that the input does not have gives no segment. */
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
    const status = asStatus(raw);
    const window = pick(status);
    return window ? limitText(label, window, spanS, status) : null;
  },
});
