import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { describedTools, shorterText } from "./tools.ts";

export const toolDescribe: Block = {
	id: "tool-describe",
	kind: "tool-text",
	routes: ["tool.describe"],
	needs: "2.1.314",
};

export const attachToolDescribe = (on: On, _context: BlockContext): void => {
	// The chain runs first, so the comparison is against text another hook may have changed.
	on("tool.describe", { tool: [...describedTools()] }, async (_$, e, next) => {
		const answer = await next(e);
		const ours = shorterText(e.tool, answer.description);
		return ours === undefined ? answer : { ...answer, description: ours };
	});
};
