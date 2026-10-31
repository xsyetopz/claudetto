import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const STATUSLINE = "statusline";

export const statusLine: Block = {
	id: "status-line",
	kind: "status-line",
	routes: ["command.run"],
	needs: "2.1.314",
};

export const attachStatusLine = (on: On, _context: BlockContext): void => {
	on("command.run", { command: STATUSLINE }, () => ({
		text: "claudetto probe: /statusline answered by the hook",
	}));
};
