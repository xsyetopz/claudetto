// The segments of the main status line, in three rows.
// Row 0 is the place: folder, git, the active change, and the `7d` window.
// Row 1 is the session: model, context, cost, and the `5h` window.
// Row 2 is the spend limit.
// Each value is a number with an icon, and a percent has the color of its projected use.

import { windowOf } from "../../../../kernel/budget.ts";
import { parseModel } from "../../../../kernel/model.ts";
import type { StatusSegment } from "../../../../kernel/slice.ts";
import { clock, dollars, span, thousands } from "./domain/format.ts";
import { paceOf } from "./domain/pace.ts";
import type { LimitWindow, Status } from "./domain/types.ts";
import { ICON } from "./icons.ts";
import {
  ARROW_FIELD,
  FIVE_HOUR_S,
  PERCENT_FIELD,
  RUNOUT_FIELD,
  SEVEN_DAY_S,
} from "./limits.ts";
import { width } from "./width.ts";

const asStatus = (status: unknown): Status => status as Status;

/** `Opus 5.5`, from the id of the model, or `null` for an id that is not a Claude model. */
const modelName = (id: string | undefined): string | null => {
  const m = parseModel(id);
  if (!m) return null;
  const family = m.family.charAt(0).toUpperCase() + m.family.slice(1);
  return `${family} ${m.major}${m.minor === null ? "" : `.${m.minor}`}`;
};

const folder: StatusSegment = {
  id: "folder",
  row: 0,
  render: (raw) => {
    const { folder: name, paint } = asStatus(raw);
    return name ? paint.bold(`${ICON.folder} ${name}`) : null;
  },
};

const git: StatusSegment = {
  id: "git",
  row: 0,
  render: (raw) => {
    const { git: state, paint } = asStatus(raw);
    if (!state) return null;
    const parts = [
      `${ICON.git} ${state.branch}`,
      state.dirty > 0 ? paint.yellow(`${ICON.dirty}${state.dirty}`) : "",
      state.ahead > 0 ? paint.green(`${ICON.ahead}${state.ahead}`) : "",
      state.behind > 0 ? paint.red(`${ICON.behind}${state.behind}`) : "",
    ];
    return parts.filter(Boolean).join(" ");
  },
};

const change: StatusSegment = {
  id: "change",
  row: 0,
  render: (raw) => {
    const { change: progress, paint } = asStatus(raw);
    if (!progress) return null;
    return paint.dim(
      `${ICON.change} ${progress.id} ${progress.done}/${progress.total}`,
    );
  },
};

const model: StatusSegment = {
  id: "model",
  row: 1,
  render: (raw) => {
    const { input, paint } = asStatus(raw);
    const name = modelName(input.model?.id) ?? input.model?.display_name;
    if (!name) return null;
    const effort = input.effort?.level
      ? paint.dim(` ${input.effort.level}`)
      : "";
    const thinking = input.thinking?.enabled ? ` ${ICON.thinking}` : "";
    return `${paint.bold(`${ICON.model} ${name}`)}${effort}${thinking}`;
  },
};

const context: StatusSegment = {
  id: "context",
  row: 1,
  render: (raw) => {
    const { input, paint } = asStatus(raw);
    const tokens = input.context_window?.total_input_tokens ?? 0;
    const size = windowOf(input.context_window?.context_window_size);
    const percent = Math.round((tokens / size) * 100);
    return paint.level(percent)(
      `${ICON.context} ${thousands(tokens)}/${thousands(size)} ${percent}%`,
    );
  },
};

const cost: StatusSegment = {
  id: "cost",
  row: 1,
  render: (raw) => {
    const { input, paint } = asStatus(raw);
    const usd = input.cost?.total_cost_usd;
    if (typeof usd !== "number" || !Number.isFinite(usd)) return null;
    const added = input.cost?.total_lines_added ?? 0;
    const removed = input.cost?.total_lines_removed ?? 0;
    const lines =
      added || removed
        ? ` ${paint.green(`${ICON.added}${added}`)} ${paint.red(`${ICON.removed}${removed}`)}`
        : "";
    return `${paint.dim(dollars(usd))}${lines}`;
  },
};

/** The pace arrow: `▼14%` in green for a reserve, `▲12%` in yellow for a deficit, and nothing at the even pace. */
const arrowText = (delta: number | null, status: Status): string => {
  if (delta === null || delta === 0) return "";
  return delta < 0
    ? status.paint.green(`${ICON.reserve}${-delta}%`)
    : status.paint.yellow(`${ICON.deficit}${delta}%`);
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
 */
const limitText = (
  label: string,
  window: LimitWindow | undefined,
  spanS: number | null,
  status: Status,
): string | null => {
  const used = window?.used_percentage;
  if (typeof used !== "number" || !Number.isFinite(used)) return null;
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
      : status.paint.red(`${ICON.runout}${timeOf(runOutAt, status)}`);
  const resetsAt = window?.resets_at ?? 0;
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

const limit = (
  id: string,
  label: string,
  row: number,
  spanS: number | null,
  pick: (status: Status) => LimitWindow | undefined,
): StatusSegment => ({
  id,
  row,
  render: (raw) => limitText(label, pick(asStatus(raw)), spanS, asStatus(raw)),
});

/**
 * Each segment of the main status line, in the order of the rows and of the places in a row.
 * The order of `5h` before `7d` is the order of the one-row placement, `SEGMENTS_ONE_ROW`.
 */
export const SEGMENTS: readonly StatusSegment[] = [
  folder,
  git,
  change,
  model,
  context,
  cost,
  limit(
    "limit-5h",
    "5h",
    1,
    FIVE_HOUR_S,
    (s) => s.input.rate_limits?.five_hour,
  ),
  limit(
    "limit-7d",
    "7d",
    0,
    SEVEN_DAY_S,
    (s) => s.input.rate_limits?.seven_day,
  ),
  limit(
    "limit-spend",
    "spend",
    2,
    null,
    (s) => s.input.rate_limits?.spend_limit,
  ),
];

const USAGE_IDS: readonly string[] = ["limit-5h", "limit-7d"];

/**
 * The placement of 1.0.0: the `5h` and `7d` windows share row 2 with the spend limit.
 * The rows use it when the two-row placement drops an item at the width.
 */
export const SEGMENTS_ONE_ROW: readonly StatusSegment[] = SEGMENTS.map(
  (segment) =>
    USAGE_IDS.includes(segment.id) ? { ...segment, row: 2 } : segment,
);
