// The segments of the main status line, in three rows.
// Row 0 is the place: folder, git, and the active change.
// Row 1 is the session: model, context, and cost.
// Row 2 is the limits.
// Each value is a number with an icon, and a percent has one of three colors.

import { windowOf } from "../../../../kernel/budget.ts";
import { parseModel } from "../../../../kernel/model.ts";
import type { StatusSegment } from "../../../../kernel/slice.ts";
import { dollars, span, thousands } from "./domain/format.ts";
import type { LimitWindow, Status } from "./domain/types.ts";
import { ICON } from "./icons.ts";

const asStatus = (status: unknown): Status => status as Status;

/** `Opus 5.5`, from the id of the model, or null for an id that is not a Claude model. */
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

/** One limit window as `◷ 5h 23% 3h12m`: the percent in one of three colors, and the time to the reset. */
const limitText = (
  label: string,
  window: LimitWindow | undefined,
  status: Status,
): string | null => {
  const used = window?.used_percentage;
  if (typeof used !== "number" || !Number.isFinite(used)) return null;
  const percent = Math.round(used);
  const resetMs = (window?.resets_at ?? 0) * 1000 - status.now;
  const reset = resetMs > 0 ? status.paint.dim(` ${span(resetMs)}`) : "";
  return `${ICON.limit} ${label} ${status.paint.level(percent)(`${percent}%`)}${reset}`;
};

const limit = (
  id: string,
  label: string,
  pick: (status: Status) => LimitWindow | undefined,
): StatusSegment => ({
  id,
  row: 2,
  render: (raw) => limitText(label, pick(asStatus(raw)), asStatus(raw)),
});

/** Each segment of the main status line, in the order of the rows and of the places in a row. */
export const SEGMENTS: readonly StatusSegment[] = [
  folder,
  git,
  change,
  model,
  context,
  cost,
  limit("limit-5h", "5h", (s) => s.input.rate_limits?.five_hour),
  limit("limit-7d", "7d", (s) => s.input.rate_limits?.seven_day),
  limit("limit-spend", "spend", (s) => s.input.rate_limits?.spend_limit),
];
