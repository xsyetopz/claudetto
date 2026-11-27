import type { On, ToolCheckResult } from "claude-code";

import { fault } from "../shared/fault";

/** What a deny names as its source: the rule, else the hook, else the setting. */
const sourceOf = (verdict: ToolCheckResult): string | undefined => {
	if (verdict.rule !== undefined) {
		return `the permission rule \`${verdict.rule}\` in the settings`;
	}
	if (verdict.hook !== undefined) {
		return `a ${verdict.hook} hook`;
	}
	if (verdict.setting !== undefined) {
		return `the \`${verdict.setting}\` setting`;
	}
	return undefined;
};

// A named settings rule read as an obstacle to clear: on claude 2.1.329 the
// reply told the user to run the command or change the rule in 3 of 9 runs
// with the source sentence alone, and 0 of 9 with this one (RISK-503). A hook
// whose message names a step, such as reading a file, read as a standing
// block: 2 of 9 runs stopped instead of taking the step (RISK-077).
const STANDING =
	"This block is the user's standing choice. When its message names a step inside the task, such as reading a file, take that step and retry; otherwise report what did not run and what it leaves undone, and leave running the command or lifting the block to the user.";

/**
 * Names the source of a deny that no person made, from core's structured verdict.
 *
 * @param verdict A `tool.check` verdict.
 * @returns The sentence to add to the model's error, or undefined when the verdict is not a deny or names no source.
 */
export const denialSource = (verdict: ToolCheckResult): string | undefined => {
	if (verdict.decision !== "deny") {
		return undefined;
	}
	const source = sourceOf(verdict);
	return source === undefined
		? undefined
		: `Denied by ${source}; no permission prompt was shown and no person declined it. ${STANDING}`;
};

/**
 * Adds the denial source to the model's error (RISK-503, issue #50).
 *
 * Engine limit (2.1.327): a deny from a settings rule reaches the model as
 * "Permission to use Bash with command … has been denied." with no source,
 * while the system prompt says a denied call is one the user declined at a
 * prompt (chunk-m14bt1pz.js:142897), so the reply names the user or the
 * prompt. A person's own decline at a prompt is not a `tool.check` deny and
 * keeps its own text. Remove once core's deny text names its rule, hook or
 * setting.
 */
export function registerDenial(on: On): void {
	on("tool.check", async (_$, e, next) => {
		const verdict = await next(e);
		const source = denialSource(verdict);
		if (source === undefined) {
			return verdict;
		}
		return {
			...verdict,
			reason:
				verdict.reason === undefined ? source : `${verdict.reason} ${source}`
		};
	}).catch(($, e, next) => {
		fault($, "denial source", next.error);
		return next(e);
	});
}
