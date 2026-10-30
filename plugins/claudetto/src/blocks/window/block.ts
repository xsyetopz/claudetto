import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onMeasure, onTurnComplete, onTurnStart } from "./hooks.ts";

export const windowBlock: Block = {
	id: "window",
	kind: "session",
	routes: ["turn.start", "turn.complete", "session.measure"],
	needs: "2.1.314",
};

export const attachWindow = (on: On, _context: BlockContext): void => {
	on("turn.start", onTurnStart);
	on("turn.complete", onTurnComplete);
	on("session.measure", onMeasure);
};
