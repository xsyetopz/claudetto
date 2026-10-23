// The segments of the main status line. A missing field gives no segment, and a field with a wrong type shows the error mark.
// Row 0 is the place (folder, git, change, `7d`), row 1 the session (model, context, cost, `5h`), and row 2 the spend limit and the cache.
import {
  HAIKU_HANDOFF_TRIGGER_TOKENS,
  HANDOFF_TRIGGER_TOKENS,
} from "../../kernel/budget.ts";
import { parseModel } from "../../kernel/model.ts";
import type { StatusSegment } from "../../kernel/slice.ts";
import {
  clock,
  type LimitWindow,
  paceOf,
  span,
  thousands,
  windowText,
} from "./format.ts";
import { ICON } from "./icons.ts";
import {
  ARROW_FIELD,
  FIVE_HOUR_S,
  PERCENT_FIELD,
  RUNOUT_FIELD,
  SEVEN_DAY_S,
  TRIGGER_WARN_FRACTION,
} from "./limits.ts";
import type { Change, Status } from "./types.ts";
import { width } from "./width.ts";

type Paint = Status["paint"];

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const segment = (
  id: string,
  row: number,
  text: (status: Status) => string | null | undefined,
): StatusSegment => ({ id, row, render: (raw) => text(raw as Status) || null });

const fieldOf = (text: string, columns: number): string =>
  text + " ".repeat(Math.max(0, columns - width(text)));

const errorMark = (paint: Paint, icon: string) =>
  paint.limit(`${icon} ${ICON.error}`);

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
  if ("error" in state) return errorMark(paint, ICON.git);
  return [
    paint.branch(`${ICON.git} ${state.branch}`),
    state.dirty > 0 ? paint.warn(`${ICON.dirty}${state.dirty}`) : "",
    state.ahead > 0 ? paint.ok(`${ICON.ahead}${state.ahead}`) : "",
    state.behind > 0 ? paint.limit(`${ICON.behind}${state.behind}`) : "",
  ]
    .filter(Boolean)
    .join(" ");
};

/** The compact form has no name, so a narrow row keeps the count. */
const changeText = (change: Change, paint: Paint, compact: boolean): string => {
  const head = compact ? ICON.change : `${ICON.change} ${change.name}`;
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

/** `▤ 12% of 1M ⇥53%`: the `used_percentage` and the `context_window_size` that Claude Code reports, and the percent of the handoff trigger that is left (the compaction threshold with `built-in`), warning within `TRIGGER_WARN_FRACTION` of it. The label is dim and the percent has the usage gradient. */
const contextText = ({ input, paint, compaction }: Status) => {
  const window = input.context_window;
  const used = window?.used_percentage;
  if (used === undefined || used === null) return null;
  if (!isNumber(used)) return errorMark(paint, ICON.context);
  const label = paint.dim(`${ICON.context} ctx`);
  const tokens = window?.total_input_tokens;
  const percent = Math.round(used);
  const size = window?.context_window_size;
  const of = isNumber(size) && size > 0 ? ` of ${windowText(size)}` : "";
  const value = paint.level(percent)(`${percent}%`);
  if (!isNumber(tokens)) return `${label} ${value}${of}`;
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
  return `${label} ${value}${of} ${style(`${icon}${distance}`)}`;
};

/** `⌁ 4m12s/5m 91%`: the time to `expires_at`, the real `ttl`, and the `hit_ratio`. Cold gives `⌁ cold +120k` (the tokens to cache again). No segment when `caching_observed` is `false`. */
const cacheText = ({ input, paint, now }: Status) => {
  const state = input.prompt_cache;
  if (!state || state.caching_observed === false) return null;
  if (typeof state.warm !== "boolean") return errorMark(paint, ICON.cache);
  const ratio = isNumber(state.hit_ratio)
    ? ` ${Math.round(state.hit_ratio * 100)}%`
    : "";
  if (state.warm) {
    const left = isNumber(state.expires_at)
      ? span(state.expires_at * 1000 - now)
      : "warm";
    return paint.ok(
      `${ICON.cache} ${left}${state.ttl ? `/${state.ttl}` : ""}${ratio}`,
    );
  }
  const recache = state.recache_tokens_if_cold;
  const tokens = isNumber(recache) ? ` +${thousands(recache)}` : "";
  return paint.inactive(`${ICON.cache} cold${tokens}${ratio}`);
};

/** The `▼13%` or `▲13%` text of the pace, or `""` when the pace has no delta. */
const arrowText = (delta: number, paint: Paint): string => {
  if (!delta) return "";
  return delta < 0
    ? paint.ok(`${ICON.reserve}${-delta}%`)
    : paint.warn(`${ICON.deficit}${delta}%`);
};

/** The `$used/$cap period` text of a spend limit, or `""` for a window with no spend. */
const moneyText = (window: LimitWindow, paint: Paint): string => {
  const { used_usd: usd, limit_usd: cap, period } = window;
  if (typeof usd !== "number" || typeof cap !== "number") return "";
  return paint.dim(
    `$${Math.round(usd)}/$${Math.round(cap)}${period ? ` ${period}` : ""}`,
  );
};

/** `◷ 5h 23% ▼13%  ↻1:50pm`, with the label dim and the percent in the gradient. Fixed fields align the windows of two rows, and `compact` has no padding. */
const limitText = (
  label: string,
  window: LimitWindow,
  spanS: number | null,
  { paint, now, compact }: Status,
): string => {
  const used = window.used_percentage;
  if (!isNumber(used))
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
  const pad = compact ? "" : " ".repeat(PERCENT_FIELD - width(`${percent}%`));
  const head = `${ICON.limit} ${paint.dim(label)} ${pad}${paint.level(percent)(`${percent}%`)}`;
  const parts = compact
    ? [arrow, runOut]
    : [fieldOf(arrow, ARROW_FIELD), fieldOf(runOut, RUNOUT_FIELD)];
  return [head, moneyText(window, paint), ...parts, reset]
    .filter((part, i) => part || (!compact && i > 1))
    .join(" ")
    .trimEnd();
};

const modelText = ({ input, paint }: Status) => {
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
};

const costText = ({ input, paint }: Status) => {
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
};

// The order of the places in a row. `5h` is before `7d` for `SEGMENTS_ONE_ROW`.
export const SEGMENTS: readonly StatusSegment[] = [
  segment("folder", 0, ({ folder, paint }) =>
    folder ? paint.bold(`${ICON.folder} ${folder}`) : null,
  ),
  segment("git", 0, (status) =>
    [gitText(status), prText(status)].filter(Boolean).join(" "),
  ),
  segment("change", 0, ({ change, paint, compact }) =>
    change ? changeText(change, paint, compact) : null,
  ),
  segment("model", 1, modelText),
  segment("context", 1, contextText),
  segment("cost", 1, costText),
  ...(
    [
      ["5h", 1, FIVE_HOUR_S, "five_hour"],
      ["7d", 0, SEVEN_DAY_S, "seven_day"],
      ["spend", 2, null, "spend_limit"],
    ] as const
  ).map(([label, row, spanS, key]) => ({
    id: `limit-${label}`,
    row,
    render: (raw: unknown) => {
      const status = raw as Status;
      const window = status.input.rate_limits?.[key];
      return window ? limitText(label, window, spanS, status) : null;
    },
  })),
  segment("cache", 2, cacheText),
];

/** The placement of 1.0.0, used when the rows drop an item at the width: `5h` and `7d` share row 2. */
export const SEGMENTS_ONE_ROW: readonly StatusSegment[] = SEGMENTS.map((s) =>
  s.id === "limit-5h" || s.id === "limit-7d" ? { ...s, row: 2 } : s,
);
