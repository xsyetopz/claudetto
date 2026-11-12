import type { On } from "claude-code";

import { ADVISOR_COMMAND, ADVISOR_USAGE } from "../../texts.ts";
import { advise } from "../../tool.call/useAdvisorTool/advisor.ts";

const TRAILING = /[.,;:!?)]+$/u;
const MENTION = /(?:^|\s)@(\S+)/gu;

/** `/advisor <question>` sends the question and each `@path` it holds through the `advisor` tool's function. */
export const advisor = (on: On): void => {
	on("command.run", { command: ADVISOR_COMMAND }, async ($, e) => {
		const question = e.args.trim();
		if (question === "") {
			return { text: ADVISOR_USAGE };
		}
		const paths = [...question.matchAll(MENTION)].map((m) =>
			(m[1] ?? "").replace(TRAILING, ""),
		);
		return { text: await advise($, question, paths) };
	});
};
