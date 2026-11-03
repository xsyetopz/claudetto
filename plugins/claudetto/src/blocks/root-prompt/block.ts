import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { ROOT_PROMPT } from "./body.ts";

export const rootPrompt: Block = {
	id: "root-prompt",
	kind: "prompt",
	routes: ["prompt.compose"],
	needs: "2.1.314",
};

const ROOT_SECTION = {
	id: "claudetto:root",
	text: ROOT_PROMPT,
	scope: "shared",
} as const;

export const attachRootPrompt = (on: On, _context: BlockContext): void => {
	// A hook that never calls `next` answers the whole section list, so the default body and its session sections are left out. The engine runs it for the main loop alone.
	on("prompt.compose", async () => ({ sections: [ROOT_SECTION] }));
};
