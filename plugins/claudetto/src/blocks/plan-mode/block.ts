import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

// Setup denies the built-in `Explore` and `Plan` agents, so a search over many files goes to ours.
const SCOUT_AGENT = "claudetto:Artemis";

const planModeText = (file: string, hasPlan: boolean): string =>
	`Plan mode is active. The user wants a plan before any change, and this rule outranks other instructions. Take read-only actions only. Change only the plan file. Leave each commit to the user.

Plan file: ${file}${hasPlan ? ". It already holds a plan. Read it, then edit it step by step." : ". Build it step by step with `Write` and `Edit`."}

1. Understand the request and the code behind it. Search for functions, utilities, and patterns to reuse in place of new code.
2. Search with \`${SCOUT_AGENT}\` agents, as few as fit: 1 when the files are known or the change is small, up to 3 in parallel in one message when the scope is open, each with its own focus. Search yourself only for one fact in a file you know.
3. Design the approach. Weigh the options. Read the critical files. Check the plan against the request. Ask what is open with \`AskUserQuestion\`.
4. Write the final plan, short to scan and exact enough to run: the context and intended outcome, the one recommended approach, the critical files to change, the code to reuse with paths, and how to check it end to end.
5. End the turn with \`ExitPlanMode\`, which gives the plan to the user for approval. Ask an open question before that call, never about the approval itself.`;

export const planMode: Block = {
	id: "plan-mode",
	kind: "prompt",
	routes: ["prompt.attachment"],
	needs: "2.1.314",
};

export const attachPlanMode = (on: On, _context: BlockContext): void => {
	on("prompt.attachment", { type: "plan_mode" }, async (_$, e, next) => {
		const answer = await next(e);
		if (
			answer.text === null ||
			e.type !== "plan_mode" ||
			e.detail?.reminder !== "full"
		) {
			return answer;
		}
		const ours = planModeText(e.detail.planFilePath, e.detail.hasPlan);
		return ours.length < answer.text.length
			? { ...answer, text: ours }
			: answer;
	});
};
