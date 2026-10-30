import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onSetupCommand, SETUP_COMMAND } from "./hooks.ts";

export const setupCommand: Block = {
	id: "setup-command",
	kind: "command",
	routes: ["command.run"],
	needs: "2.1.314",
};

export const attachSetupCommand = (on: On, _context: BlockContext): void => {
	// Answers `{ text }` with no `context`, so the model reads nothing and the session pays no tokens.
	on("command.run", { command: SETUP_COMMAND }, onSetupCommand);
};
