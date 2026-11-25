import type { SessionContextBreakdown } from "claude-code";

import { wholePercent } from "../line/format";
import { barRuns, dim, levelColor, type Line, run, tokensText } from "./runs";

/** The glyph /context's grid gives a row's squares, by kind: full for content, shaded for the compaction buffer, light for free space. */
const glyphOf = (kind: string): string => {
	if (kind === "free") {
		return "░";
	}
	return kind === "buffer" ? "▒" : "█";
};

/**
 * The context window by /context's rows: a bar of the whole window split by
 * row in /context's colours, then one row per category with its tokens and
 * share of the window; deferred tool schemas, outside the window, last and dim.
 */
export const contextLines = (
	breakdown: SessionContextBreakdown,
	cells: number
): Line[] => {
	const { categories, rawMaxTokens, totalTokens } = breakdown;
	const window = categories.filter((row) => !row.isDeferred);
	const deferred = categories.filter((row) => row.isDeferred && row.tokens > 0);
	const width = Math.max(...categories.map((row) => row.name.length), 0);
	const share = (tokens: number): string =>
		rawMaxTokens > 0 ? `${((tokens / rawMaxTokens) * 100).toFixed(1)}%` : "";
	return [
		[
			run("Context ", "claude"),
			run(`${tokensText(totalTokens)} of ${tokensText(rawMaxTokens)}`),
			run(
				` ${wholePercent(breakdown.percentage)}%`,
				levelColor(breakdown.percentage)
			),
			dim(" · local estimate, as /context counts")
		],
		barRuns(
			window.map((row) => ({
				weight: row.tokens,
				color: row.color,
				glyph: glyphOf(row.kind)
			})),
			cells
		),
		...window.map((row): Line => [
			run(`${glyphOf(row.kind)} `, row.color),
			run(row.name.padEnd(width)),
			run(` ${tokensText(row.tokens).padStart(6)}`),
			dim(` ${share(row.tokens).padStart(6)}`)
		]),
		...deferred.map((row): Line => [
			dim(
				`  ${row.name.padEnd(width)} ${tokensText(row.tokens).padStart(6)}  loaded on demand, outside the window`
			)
		])
	];
};
