import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const agentOffer: Block = {
	id: "agent-offer",
	kind: "agent",
	routes: ["agent.offer"],
	needs: "2.1.314",
};

export const attachAgentOffer = (on: On, _context: BlockContext): void => {
	// Refusing the offer drops `main`'s listing line, since the thread's own body is no delegation target.
	on("agent.offer", { agent: "claudetto:main" }, async () => ({
		isOffered: false,
	}));
};
