import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onSetupStart, onSetupTool } from "../settings-commands.ts";
import { SETUP_MATCH } from "./setup.ts";

export const setupCommand: Block = {
	id: "setup-command",
	kind: "command",
	routes: ["session.start", "tool.call"],
	needs: "2.1.314",
};

export const attachSetupCommand = (on: On, _context: BlockContext): void => {
	// No `command.run` hook, so the body of `commands/setup.md` reaches the model, which asks the user.
	// A session with nobody to answer `AskUserQuestion` cannot choose keys, so it gets no tool.
	on("session.start", { isInteractive: [true] }, onSetupStart);
	on("tool.call", SETUP_MATCH, onSetupTool);
};
