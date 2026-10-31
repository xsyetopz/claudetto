import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onStep, onToolCall } from "./hooks.ts";

export const priceStep: Block = {
	id: "price-step",
	kind: "policy",
	routes: ["turn.step", "tool.call"],
	needs: "2.1.314",
};

export const attachPriceStep = (on: On, _context: BlockContext): void => {
	on("turn.step", onStep);
	on("tool.call", onToolCall);
};
