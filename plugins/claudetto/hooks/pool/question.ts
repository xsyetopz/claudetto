import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { QUESTION_RULE } from "./question-rule";

/**
 * Appends `QUESTION_RULE` to the AskUserQuestion description. Register it
 * before `registerToolDescribe`, which ends the chain, so the text lands on the
 * short AskUserQuestion text.
 *
 * @param on The engine's hook registrar.
 */
export function registerQuestionRule(on: On): void {
	on("tool.describe", { tool: "AskUserQuestion" }, async (_$, e, next) => {
		const result = await next(e);
		return {
			...result,
			description: `${result.description}${QUESTION_RULE}`
		};
	}).catch(($, e, next) => {
		fault($, "question rule", next.error);
		return next(e);
	});
}
