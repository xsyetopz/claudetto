// The segments of the main status line. A missing field gives no segment, and a field with a wrong type shows the error mark.
// Row 0 is the place (folder, git, change, `7d`), row 1 the session (model, context, cost, `5h`), and row 2 the spend limit and the cache.

import {
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../../../kernel/budget.ts";
import { parseModel } from "../../../../kernel/model.ts";
import type { StatusSegment } from "../../../../kernel/slice.ts";
import { span, thousands, windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { limit } from "./limit-segment.ts";
import { FIVE_HOUR_S, SEVEN_DAY_S, TRIGGER_WARN_FRACTION } from "./limits.ts";
import type { Change, Status } from "./types.ts";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const segment = (
  id: string,
  row: number,
  text: (status: Status) => string | null | undefined,
): StatusSegment => ({ id, row, render: (raw) => text(raw as Status) || null });

/** `⇄ #12 approved`, in the color of the review state. */
const prText = ({ input, paint }: Status): string | null => {
  const request = input.pr;
  if (!request) return null;
  const style = paint.review(request.review_state);
  if (!isNumber(request.number)) return style(`${ICON.pr} ${ICON.error}`);
  const mark = request.kind === "mr" ? "!" : "#";
  const state = request.review_state ? ` ${request.review_state}` : "";
  return style(`${ICON.pr} ${mark}${request.number}${state}`);
};

const gitText = ({ git: state, paint }: Status): string | null => {
  if (!state) return null;
  if ("error" in state) return paint.limit(`${ICON.git} ${ICON.error}`);
  return [
    paint.branch(`${ICON.git} ${state.branch}`),
    state.dirty > 0 ? paint.warn(`${ICON.dirty}${state.dirty}`) : "",
    state.ahead > 0 ? paint.ok(`${ICON.ahead}${state.ahead}`) : "",
    state.behind > 0 ? paint.limit(`${ICON.behind}${state.behind}`) : "",
  ]
    .filter(Boolean)
    .join(" ");
};

const changeText = (change: Change, paint: Status["paint"]): string => {
  const head = `${ICON.change} ${change.name}`;
  switch (change.state) {
    case "planning":
      return paint.dim(`${head} planning`);
    case "open":
      return paint.dim(
        `${head} ${change.done}/${change.total} ${ICON.next}${change.next}`,
      );
    case "done":
      return paint.ok(`${head} ${change.total}/${change.total} ${ICON.done}`);
    case "error":
      return paint.limit(`${head} ${ICON.error}`);
  }
};

/** `▤ 12% of 1M ⇥53%`: the `used_percentage` and the `context_window_size` that Claude Code reports, and the percent of the handoff trigger that is left (the compaction threshold with `built-in`), warning within `TRIGGER_WARN_FRACTION` of it. */
const contextText = ({ input, paint, compaction }: Status) => {
  const window = input.context_window;
  const used = window?.used_percentage;
  if (used === undefined || used === null) return null;
  if (!isNumber(used)) return paint.limit(`${ICON.context} ${ICON.error}`);
  const tokens = window?.total_input_tokens;
  const percent = Math.round(used);
  const size = window?.context_window_size;
  const of = isNumber(size) && size > 0 ? ` of ${windowText(size)}` : "";
  if (!isNumber(tokens))
    return paint.level(percent)(`${ICON.context} ${percent}%${of}`);
  const trigger =
    parseModel(input.model?.id)?.family === "haiku"
      ? HAIKU_HANDOFF_TRIGGER_TOKENS
      : HANDOFF_TRIGGER_TOKENS;
  const left = trigger - tokens;
  const style =
    left <= 0
      ? paint.limit
      : left <= trigger * TRIGGER_WARN_FRACTION
        ? paint.warn
        : paint.ok;
  const icon = compaction ? ICON.compaction : ICON.handoff;
  const distance = left <= 0 ? "now" : `${Math.round((left / trigger) * 100)}%`;
  return style(`${ICON.context} ${percent}%${of} ${icon}${distance}`);
};

/** `⌁ 4m12s/5m 91%`: the time to `expires_at`, the real `ttl`, and the `hit_ratio`. Cold gives `⌁ cold +120k` (the tokens to cache again). No segment when `caching_observed` is `false`. */
const cacheText = ({ input, paint, now }: Status) => {
  const state = input.prompt_cache;
  if (!state || state.caching_observed === false) return null;
  if (typeof state.warm !== "boolean")
    return paint.limit(`${ICON.cache} ${ICON.error}`);
  const ratio = isNumber(state.hit_ratio)
    ? ` ${Math.round(state.hit_ratio * 100)}%`
    : "";
  if (state.warm) {
    const left = isNumber(state.expires_at)
      ? span(state.expires_at * 1000 - now)
      : "warm";
    const ttl = state.ttl ? `/${state.ttl}` : "";
    return paint.ok(`${ICON.cache} ${left}${ttl}${ratio}`);
  }
  const recache = state.recache_tokens_if_cold;
  const tokens = isNumber(recache) ? ` +${thousands(recache)}` : "";
  return paint.inactive(`${ICON.cache} cold${tokens}${ratio}`);
};

// The order of the places in a row. `5h` is before `7d` for `SEGMENTS_ONE_ROW`.
export const SEGMENTS: readonly StatusSegment[] = [
  segment("folder", 0, ({ folder, paint }) =>
    folder ? paint.bold(`${ICON.folder} ${folder}`) : null,
  ),
  segment("git", 0, (status) =>
    [gitText(status), prText(status)].filter(Boolean).join(" "),
  ),
  segment("change", 0, ({ change, paint }) =>
    change ? changeText(change, paint) : null,
  ),
  segment("model", 1, ({ input, paint }) => {
    const name = input.model?.display_name || input.model?.id;
    if (!name) return null;
    const level = input.effort?.level;
    const effort =
      input.effort === undefined
        ? ""
        : typeof level === "string"
          ? paint.dim(` ${level}`)
          : ` ${paint.limit(ICON.error)}`;
    const thinking = input.thinking?.enabled ? ` ${ICON.thinking}` : "";
    const fast = input.fast_mode ? ` ${paint.warn(ICON.fast)}` : "";
    return `${paint.model(`${ICON.model} ${name}`)}${effort}${thinking}${fast}`;
  }),
  segment("context", 1, contextText),
  segment("cost", 1, ({ input, paint }) => {
    const usd = input.cost?.total_cost_usd;
    if (usd === undefined) return null;
    if (!isNumber(usd)) return paint.limit(ICON.error);
    const added = input.cost?.total_lines_added ?? 0;
    const removed = input.cost?.total_lines_removed ?? 0;
    const lines =
      added || removed
        ? ` ${paint.ok(`${ICON.added}${added}`)} ${paint.limit(`${ICON.removed}${removed}`)}`
        : "";
    return `${paint.dim(`$${usd.toFixed(2)}`)}${lines}`;
  }),
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
  segment("cache", 2, cacheText),
];

/** The placement of 1.0.0, used when the rows drop an item at the width: `5h` and `7d` share row 2. */
export const SEGMENTS_ONE_ROW: readonly StatusSegment[] = SEGMENTS.map((s) =>
  s.id === "limit-5h" || s.id === "limit-7d" ? { ...s, row: 2 } : s,
);
