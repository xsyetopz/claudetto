// Spec `prompt-base`, D20 (task 10.10): a tool that fewer than `DEFER_BELOW_PERCENT` of the counted sessions use goes behind `ToolSearch`, and a roster tool never does.

import { expect, test } from "bun:test";
import { DEFERRED_TOOLS } from "../../../../plugins/claudetto/modules/session/prompt/domain/tools.ts";
import {
	COUNTED_SESSIONS,
	DEFER_BELOW_PERCENT,
	NEVER_DEFERRED,
	TOOL_SESSION_USE,
} from "../../../../plugins/claudetto/modules/session/prompt/limits.ts";

const ROSTER_TOOLS = [
	"Read",
	"Edit",
	"Write",
	"Grep",
	"Glob",
	"Bash",
	"Monitor",
	"WebSearch",
	"WebFetch",
	"Agent",
	"SendMessage",
];

test("each deferred tool is used by fewer than the bound of the counted sessions", () => {
	for (const tool of DEFERRED_TOOLS) {
		expect(
			((TOOL_SESSION_USE[tool] ?? 0) * 100) / COUNTED_SESSIONS,
			tool,
		).toBeLessThan(DEFER_BELOW_PERCENT);
	}
});

test("each tool under the bound that is not in `NEVER_DEFERRED` is deferred", () => {
	const under = Object.keys(TOOL_SESSION_USE).filter(
		(tool) =>
			(TOOL_SESSION_USE[tool] ?? 0) * 100 <
				DEFER_BELOW_PERCENT * COUNTED_SESSIONS &&
			!NEVER_DEFERRED.includes(tool),
	);
	expect(
		[...DEFERRED_TOOLS].sort((a, b) => Number(a > b) - Number(a < b)),
	).toStrictEqual(under.sort((a, b) => Number(a > b) - Number(a < b)));
});

test("no roster tool, `ToolSearch`, or tool that ends a run is deferred", () => {
	for (const tool of [
		...ROSTER_TOOLS,
		"ToolSearch",
		"SubagentHandback",
		"StructuredOutput",
	]) {
		expect(DEFERRED_TOOLS, tool).not.toContain(tool);
	}
});
