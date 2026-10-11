// The segments of the main status line, in three groups.
// `core` is the session: model, context, and cache.
// `quota` is the usage: each limit window with its pace and reset credits.
// Each segment carries a priority, and `layout.ts` drops the lowest first.
// The place segments are in `place.ts`.

import { USAGE_LEVELS, windowOf } from "../../lib/budget.ts";
import { parseModel } from "../../lib/model.ts";
import { cacheLeft, cacheStats, headroom, pace, rates } from "./derive.ts";
import { clock, countdown, shortModel } from "./format.ts";
import { CACHE_ALARM_S, SUBAGENT_EFFORTS } from "./limits.ts";
import { alarm, C, ICON, levelColor, meter } from "./paint.ts";
import type {
  Cost,
  Credits,
  Fable,
  LimitWindow,
  Pace,
  PromptCache,
  RateLimits,
  RenderCtx,
  Segment,
  StatusInput,
  Text,
} from "./types.ts";

export const k = (n: number): string => `${Math.round(n / 1000)}k`;
const money = (n: number): string => `$${n.toFixed(2)}`;

/** The effort levels that the rules allow for a model, or undefined. */
function allowedEfforts(modelId: string | undefined): string[] | undefined {
  const m = parseModel(modelId);
  if (!m || m.minor === null) return undefined;
  return SUBAGENT_EFFORTS[`${m.family}-${m.major}-${m.minor}`];
}

/** " high", red with a warning glyph when the rules do not allow it for the model. */
export function effortText(
  modelId: string | undefined,
  level: string | undefined,
): string {
  if (!level) return "";
  const allowed = allowedEfforts(modelId);
  return allowed && !allowed.includes(level)
    ? ` ${C.red(`${level} ${ICON.warn}`)}`
    : ` ${C.dim(level)}`;
}

/** Context against `window`, with a blinking warning glyph from the second level. */
export function contextText(
  tokens: number,
  window: number,
  now: number,
): string {
  const pct = Math.round((tokens / window) * 100);
  return (
    alarm(pct >= USAGE_LEVELS[1], now) +
    meter(ICON.context, pct, `${k(tokens)}/${k(window)} ${pct}%`) +
    C.dim(` ${ICON.headroom}${k(headroom(tokens, window))}`)
  );
}

/** The time until the cache expires (a blinking warning in the last `CACHE_ALARM_S`), or the cold state. */
export function cacheText(cache: PromptCache, now: number): string {
  const left = cacheLeft(cache, now / 1000);
  if (!(left > 0)) {
    const rebuild = cache.recache_tokens_if_cold ?? 0;
    const tokens = rebuild ? ` ${C.yellow(`${k(rebuild)} to rebuild`)}` : "";
    return C.dim(`${ICON.cold} cold`) + tokens;
  }
  return `${alarm(left < CACHE_ALARM_S, now)}${C.green(`${ICON.warm} ${countdown(left)}`)}`;
}

/** The hit ratio, scaled by its miss share, and the misses with the cause of the last one. */
export function cacheDetailText(cache: PromptCache): string {
  const { hit, misses, last } = cacheStats(cache);
  return [
    hit !== null && `${C.dim("hit")} ${levelColor(100 - hit)(`${hit}%`)}`,
    misses > 0 &&
      C.yellow(
        `${ICON.miss}${misses}${last ? ` ${last.replace(/_changed$/, "")}` : ""}`,
      ),
  ]
    .filter(Boolean)
    .join(" ");
}

/** The pace text: `▲12%` for a deficit, `▼30%` for a reserve, and `⏵12:46pm` for the run-out time. */
function paceText(p: Pace | null, used: number, nowMs: number): string {
  if (!p) return "";
  const text =
    p.delta < 0
      ? C.green(`${ICON.reserve}${-p.delta}%`)
      : p.delta > 0
        ? C.yellow(`${ICON.deficit}${p.delta}%`)
        : "";
  const runOut = p.runOutAt
    ? (used >= USAGE_LEVELS[0] ? C.red : C.yellow)(
        `${ICON.runout}${clock(p.runOutAt, nowMs)}`,
      )
    : "";
  return [text, runOut].filter(Boolean).join(" ");
}

/** One limit window of `span` seconds: `5h █░░░░ 23% ▼10% ↻3pm`. */
export function limitText(
  label: string,
  window: LimitWindow,
  nowMs: number,
  span: number,
): string {
  const pct = Math.round(window.used_percentage);
  const p = span ? pace(window, nowMs / 1000, span) : null;
  const pacing = paceText(p, window.used_percentage, nowMs);
  const resetsAt = window.resets_at as number;
  const reset =
    resetsAt * 1000 > nowMs
      ? C.dim(` ${ICON.reset}${clock(resetsAt, nowMs)}`)
      : "";
  return (
    alarm(pct >= USAGE_LEVELS[1], nowMs) +
    meter(C.dim(label), pct, `${pct}%`.padStart(4)) +
    (pacing ? ` ${pacing}` : "") +
    reset
  );
}

/** The weekly window of Fable: `✧ █░░░░  12% ↻Oct 12 at 4am`. `fable` is `{percent, resetsAt}`. */
export const fableText = (fable: Fable, nowMs: number): string =>
  limitText(
    ICON.fable,
    { used_percentage: fable.percent, resets_at: fable.resetsAt },
    nowMs,
    0,
  );

/** The reset credits: `⟳2 by Oct 9 at 3pm`. */
export const creditsText = ({ left, until }: Credits, nowMs: number): string =>
  C.green(`${ICON.credit}${left}`) +
  (until ? C.dim(` by ${clock(until, nowMs)}`) : "");

/** The cost and the rates: `$6.00 $3.00/h`, and the changed lines: `+300 -0 150/h`. */
export function costTexts(cost: Cost | undefined): {
  spend: string;
  lines: string;
} {
  const r = rates(cost);
  const usd = cost?.total_cost_usd;
  const spend =
    typeof usd === "number" && Number.isFinite(usd)
      ? C.dim(
          `${money(usd)}${r?.costPerHour != null ? ` ${money(r.costPerHour)}/h` : ""}`,
        )
      : "";
  const {
    total_lines_added: added = 0,
    total_lines_removed: removed = 0,
  }: Cost = cost ?? {};
  const lines =
    added || removed
      ? `${C.green(`+${added}`)} ${C.red(`-${removed}`)}${r ? C.dim(` ${Math.round(r.linesPerHour)}/h`) : ""}`
      : "";
  return { spend, lines };
}

const LIMITS: [keyof RateLimits, string, number, number][] = [
  ["five_hour", "5h", 8, 5 * 3600],
  ["seven_day", "7d", 6, 7 * 86_400],
  ["spend_limit", "spend", 6, 0],
];

/**
 * The `core` and `quota` groups for the status object `data`.
 * `ctx` has the clock `now` in milliseconds and `credits`.
 */
export function usageGroups(
  data: StatusInput,
  ctx: Pick<RenderCtx, "now" | "credits">,
): [Segment[], Segment[]] {
  const { now } = ctx;
  const [core, quota]: [Segment[], Segment[]] = [[], []];
  const add = (group: Segment[], priority: number, text: Text, id: string) => {
    if (text) group.push({ priority, text, id });
  };
  const model = shortModel(data.model?.id) || data.model?.display_name;
  add(
    core,
    10,
    model &&
      C.bold(model) +
        effortText(data.model?.id, data.effort?.level) +
        (data.thinking?.enabled ? C.dim(` ${ICON.thinking}`) : "") +
        (data.fast_mode ? ` ${C.red("FAST")}` : ""),
    "model",
  );
  const tokens = data.context_window?.total_input_tokens ?? 0;
  const window = windowOf(data.context_window?.context_window_size);
  add(core, 10, contextText(tokens, window, now), "context");
  const cache = data.prompt_cache;
  if (cache && typeof cache === "object" && cache.caching_observed !== false) {
    add(core, 7, cacheText(cache, now), "cache");
    add(core, 3, cacheDetailText(cache), "cacheDetail");
  }
  const limits: RateLimits = data.rate_limits ?? {};
  for (const [key, label, priority, span] of LIMITS) {
    const w = limits[key];
    if (!w || !Number.isFinite(w.used_percentage)) continue;
    const urgent = w.used_percentage >= USAGE_LEVELS[0];
    add(quota, urgent ? 9 : priority, limitText(label, w, now, span), key);
  }
  add(quota, 4, ctx.credits && creditsText(ctx.credits, now), "credits");
  const { spend, lines } = costTexts(data.cost);
  add(quota, 3, spend, "cost");
  add(quota, 2, lines, "lines");
  return [core, quota];
}
