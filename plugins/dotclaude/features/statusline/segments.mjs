// The segments of the main status line, in three groups.
// `core` is the session: model, context, and cache.
// `quota` is the usage: each limit window with its pace, burn rate, and reset credits.
// Each segment carries a priority, and `layout.mjs` drops the lowest first.
// The place segments are in `place.mjs`.

import { CONTEXT_WINDOW, USAGE_LEVELS } from "../../lib/budget.mjs";
import { cacheLeft, cacheStats, headroom, pace, rates } from "./derive.mjs";
import { clock, countdown, shortModel } from "./format.mjs";
import { CACHE_ALARM_S, SUBAGENT_EFFORTS } from "./limits.mjs";
import { alarm, C, ICON, levelColor, meter } from "./paint.mjs";

export const k = (n) => `${Math.round(n / 1000)}k`;
const money = (n) => `$${n.toFixed(2)}`;

/** The effort levels that the rules allow for a model, or undefined. */
function allowedEfforts(modelId) {
  const m = /claude-([a-z]+)-(\d+)-(\d{1,2})(?!\d)/i.exec(
    String(modelId ?? ""),
  );
  return m && SUBAGENT_EFFORTS[`${m[1]}-${m[2]}-${m[3]}`.toLowerCase()];
}

/** " high", red with a warning glyph when the rules do not allow it for the model. */
export function effortText(modelId, level) {
  if (!level) return "";
  const allowed = allowedEfforts(modelId);
  return allowed && !allowed.includes(level)
    ? ` ${C.red(`${level} ${ICON.warn}`)}`
    : ` ${C.dim(level)}`;
}

/** Context against `window`, with a blinking warning glyph from the second level. */
export function contextText(tokens, window, now) {
  const pct = Math.round((tokens / window) * 100);
  return (
    alarm(pct >= USAGE_LEVELS[1], now) +
    meter(ICON.context, pct, `${k(tokens)}/${k(window)} ${pct}%`) +
    C.dim(` ${ICON.headroom}${k(headroom(tokens, window))}`)
  );
}

/** The time until the cache expires (a blinking warning in the last `CACHE_ALARM_S`), or the cold state. */
export function cacheText(cache, now) {
  const left = cacheLeft(cache, now / 1000);
  if (!(left > 0)) {
    const rebuild = cache.recache_tokens_if_cold ?? 0;
    const tokens = rebuild ? ` ${C.yellow(`${k(rebuild)} to rebuild`)}` : "";
    return C.dim(`${ICON.cold} cold`) + tokens;
  }
  return `${alarm(left < CACHE_ALARM_S, now)}${C.green(`${ICON.warm} ${countdown(left)}`)}`;
}

/** The hit ratio, scaled by its miss share, and the misses with the cause of the last one. */
export function cacheDetailText(cache) {
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
function paceText(p, used, nowMs) {
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
export function limitText(label, window, nowMs, span) {
  const pct = Math.round(window.used_percentage);
  const p = span ? pace(window, nowMs / 1000, span) : null;
  const pacing = paceText(p, window.used_percentage, nowMs);
  const reset =
    window.resets_at * 1000 > nowMs
      ? C.dim(` ${ICON.reset}${clock(window.resets_at, nowMs)}`)
      : "";
  return (
    alarm(pct >= USAGE_LEVELS[1], nowMs) +
    meter(C.dim(label), pct, `${pct}%`.padStart(4)) +
    (pacing ? ` ${pacing}` : "") +
    reset
  );
}

/** The weekly window of Fable: `✧ █░░░░  12% ↻Oct 12 at 4am`. `fable` is `{percent, resetsAt}`. */
export const fableText = (fable, nowMs) =>
  limitText(
    ICON.fable,
    { used_percentage: fable.percent, resets_at: fable.resetsAt },
    nowMs,
    0,
  );

/** `ϟ12%/h`, or `↺ reset used` after the percentage dropped inside the window. */
export function burnText(burn) {
  if (!burn) return "";
  if (burn.resetUsed) return C.green(`${ICON.resetUsed} reset used`);
  return burn.rate === null
    ? ""
    : C.dim(`${ICON.burn}${Math.round(burn.rate)}%/h`);
}

/** The reset credits: `⟳2 by Oct 9 at 3pm`. */
export const creditsText = ({ left, until }, nowMs) =>
  C.green(`${ICON.credit}${left}`) +
  (until ? C.dim(` by ${clock(until, nowMs)}`) : "");

/** The cost and the rates: `$6.00 $3.00/h`, and the changed lines: `+300 -0 150/h`. */
export function costTexts(cost) {
  const r = rates(cost);
  const spend = Number.isFinite(cost?.total_cost_usd)
    ? C.dim(
        `${money(cost.total_cost_usd)}${r?.costPerHour != null ? ` ${money(r.costPerHour)}/h` : ""}`,
      )
    : "";
  const { total_lines_added: added = 0, total_lines_removed: removed = 0 } =
    cost ?? {};
  const lines =
    added || removed
      ? `${C.green(`+${added}`)} ${C.red(`-${removed}`)}${r ? C.dim(` ${Math.round(r.linesPerHour)}/h`) : ""}`
      : "";
  return { spend, lines };
}

const LIMITS = [
  ["five_hour", "5h", 8, 5 * 3600],
  ["seven_day", "7d", 6, 7 * 86_400],
  ["spend_limit", "spend", 6, 0],
];

/**
 * The `core` and `quota` groups for the status object `data`.
 * `ctx` has the clock `now` in milliseconds, `burn` (`{rate, resetUsed}`), and `credits`.
 */
export function usageGroups(data, ctx) {
  const { now } = ctx;
  const [core, quota] = [[], []];
  const add = (group, priority, text, id) => {
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
  const window = Math.min(
    data.context_window?.context_window_size || CONTEXT_WINDOW,
    CONTEXT_WINDOW,
  );
  add(core, 10, contextText(tokens, window, now), "context");
  const cache = data.prompt_cache;
  if (cache && typeof cache === "object" && cache.caching_observed !== false) {
    add(core, 7, cacheText(cache, now), "cache");
    add(core, 3, cacheDetailText(cache), "cacheDetail");
  }
  const limits = data.rate_limits ?? {};
  for (const [key, label, priority, span] of LIMITS) {
    const w = limits[key];
    if (!Number.isFinite(w?.used_percentage)) continue;
    const urgent = w.used_percentage >= USAGE_LEVELS[0];
    add(quota, urgent ? 9 : priority, limitText(label, w, now, span), key);
    if (key === "five_hour") add(quota, 5, burnText(ctx.burn), "burn");
  }
  add(quota, 4, ctx.credits && creditsText(ctx.credits, now), "credits");
  const { spend, lines } = costTexts(data.cost);
  add(quota, 3, spend, "cost");
  add(quota, 2, lines, "lines");
  return [core, quota];
}
