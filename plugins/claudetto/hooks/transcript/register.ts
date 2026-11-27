import type { Elements, On, RenderElement } from "claude-code";

import { type Call, summary } from "./rows";

type Colour = "success" | "error" | "subtle";
type Table = Elements["terminal"];

const bulletOf = (calls: readonly Call[]): Colour => {
	if (calls.some((call) => call.isErrored)) {
		return "error";
	}
	return calls.some((call) => call.isRunning) ? "subtle" : "success";
};

/** The one collapsed row for `calls`: bullet, summary, and a failed or interrupted tail. */
function rowOf(
	{ Box, Text }: Table,
	calls: readonly Call[],
	isGrouped: boolean
): RenderElement {
	const tail: RenderElement[] = [];
	if (calls.some((call) => call.isErrored)) {
		tail.push(Text({ color: "error", children: " failed (ctrl+o to expand)" }));
	} else if (calls.some((call) => call.isInterrupted)) {
		tail.push(Text({ color: "subtle", children: " interrupted" }));
	}
	return Box({
		children: [
			Text({ color: bulletOf(calls), children: "●" }),
			Text({ children: ` ${summary(calls, isGrouped)}` }),
			...tail
		]
	});
}

/**
 * Draws the transcript as agy does: the typed message in the brand colour, and
 * each collapsed tool row or all-calls group as one `● Ran 1 command (…)` line.
 * An expanded row (ctrl+o, --verbose) keeps the engine's drawing.
 */
export function registerTranscript(on: On): void {
	on(
		"ui.render",
		{
			component: ["UserMessage", "ToolUse", "ToolResult", "ToolGroup"],
			surface: "terminal",
			plugin: "*"
		},
		($, e, next) => {
			const table = $.ui.resolve(e);
			if (e.component === "UserMessage") {
				return e.props.origin.kind === "composer"
					? table.Text({ color: "claude", children: `❯ ${e.props.text}` })
					: next(e);
			}
			if (e.component === "ToolGroup") {
				return e.props.isExpanded || e.props.isCallsOnly !== true
					? next(e)
					: rowOf(table, e.props.calls, true);
			}
			if (e.props.isExpanded === true) {
				return next(e);
			}
			return e.component === "ToolUse"
				? rowOf(table, [e.props], false)
				: table.Box({});
		}
	);
}
