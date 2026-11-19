import type { On } from "claude-code";
import { fault } from "../fault";

/** What the line shows; each field is absent until the engine reports it. */
export type Figures = {
	readonly model?: string;
	readonly contextPercent?: number | undefined;
	readonly fiveHour?: number | undefined;
	readonly sevenDay?: number | undefined;
	readonly cacheHit?: number | undefined;
};

type Usage = {
	readonly input_tokens: number;
	readonly cache_read_input_tokens: number;
	readonly cache_creation_input_tokens: number;
};

/** Share of a turn's prompt tokens the cache served, in whole percent; undefined when the turn had none. */
export const cacheHitPercent = (usage: Usage): number | undefined => {
	const total = usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens;
	return total > 0 ? wholePercent((usage.cache_read_input_tokens / total) * 100) : undefined;
};

/** Rounds to whole percent but keeps 99 for anything under 100, so "100%" only appears when the figure is reached. */
const wholePercent = (n: number): number => (n < 100 ? Math.min(Math.round(n), 99) : Math.round(n));

/** The line: model, context, 5h/7d rate-limit percent and cache hit; fields the engine has not reported are left out. */
export const formatLine = (f: Figures): string => {
	const parts: string[] = [];
	if (f.model !== undefined) parts.push(f.model);
	if (f.contextPercent !== undefined) parts.push(`ctx ${wholePercent(f.contextPercent)}%`);
	if (f.fiveHour !== undefined) parts.push(`5h ${wholePercent(f.fiveHour)}%`);
	if (f.sevenDay !== undefined) parts.push(`7d ${wholePercent(f.sevenDay)}%`);
	if (f.cacheHit !== undefined) parts.push(`cache ${f.cacheHit}%`);
	return parts.join(" | ");
};

/**
 * Pins the minimal status line (ADR-0190, REQ-COST-004): `session.measure`
 * moves context and rate limits, `turn.complete` the cache figure of the last
 * main-loop turn. Subagent turns are skipped, since their cache is not the
 * lead's. The figures live in this closure because a hook instance is per session.
 * Claude Code 2.1.327 draws every pinned plugin status as "⚠ claudetto: …" in
 * its warning colour (chunk-cfxefa64.js, the pinned-notice renderer), so the
 * glyph is the engine's frame and not a fault this line reports.
 */
export function registerStatusline(on: On): void {
	let figures: Figures = {};
	on("session.measure", async ($, e, next) => {
		const limit = (kind: string) => e.rateLimits.find((r) => r.kind === kind)?.percentUsed;
		figures = {
			...figures,
			model: await $.session.model(),
			contextPercent: e.context.percent,
			fiveHour: limit("five_hour"),
			sevenDay: limit("seven_day"),
		};
		$.ui.status(formatLine(figures));
		return next(e);
	}).catch(($, e, next) => (fault($, "status line", next.error), next(e)));
	on("turn.complete", { reason: "answer" }, async ($, e, next) => {
		if (e.agentId === undefined && e.usage !== undefined) {
			figures = { ...figures, model: await $.session.model(), cacheHit: cacheHitPercent(e.usage) };
			$.ui.status(formatLine(figures));
		}
		return next(e);
	}).catch(($, e, next) => (fault($, "status line", next.error), next(e)));
}
