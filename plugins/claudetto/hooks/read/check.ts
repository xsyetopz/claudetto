import type { On } from "claude-code";

import { absolute } from "../patch/paths";
import { fault } from "../shared/fault";
import { fieldOf } from "../shared/field";
import { isModesAsk } from "../shared/verdict";
import { TOOL_FULL_NAME } from "./texts";
import { readPaths } from "./tool";

/**
 * Gives `read` the deny or rule-made ask the engine gives the built-in Read for each path it
 * names. The mode's own ask (a path outside the working folders) gives way: reads run free,
 * and deny rules and the sandbox keep secrets out (ISSUES-part12, a dialog on a `/tmp` image).
 */
export function registerReadCheck(on: On): void {
	on("tool.check", { tool: TOOL_FULL_NAME }, async ($, e, next) => {
		const verdict = await next(e);
		const paths = readPaths(e.input);
		if (
			verdict.decision === "deny" ||
			typeof fieldOf(e.input, "file_path") !== "string"
		) {
			return verdict;
		}
		const cwd = await $.session.cwd();
		// Each path gets the verdict the built-in Read would get for it alone.
		const verdicts = await Promise.all(
			paths.map((given) =>
				$.tool.check({
					tool: "Read",
					input: { file_path: absolute(cwd, given) }
				})
			)
		);
		const refused = verdicts.find(
			(read) => read.decision !== "allow" && !isModesAsk(read)
		);
		if (refused !== undefined) {
			return refused;
		}
		// A rule written for `read` itself keeps its ask; the engine's default ask for an MCP tool gives way to the Read verdict.
		return verdict.rule === undefined ? { decision: "allow" } : verdict;
	}).catch(($, _e, next) => {
		fault($, "read check", next.error);
		return { decision: "ask", reason: "`read` could not check its path" };
	});
}
