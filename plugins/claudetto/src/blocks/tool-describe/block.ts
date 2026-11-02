import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { describeAnswer, describedTools } from "./tools.ts";

export const toolDescribe: Block = {
	id: "tool-describe",
	kind: "tool-text",
	routes: ["tool.describe"],
	needs: "2.1.314",
};

export const attachToolDescribe = (on: On, _context: BlockContext): void => {
	// The chain runs first, so the comparison is against text another hook may have changed.
	on("tool.describe", { tool: [...describedTools()] }, async (_$, e, next) =>
		describeAnswer(e.tool, await next(e)),
	);
};
