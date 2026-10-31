import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onStatuslineCommand } from "../settings-commands.ts";
import { onStatuslineDescribe, STATUSLINE } from "./hooks.ts";

export const statusLine: Block = {
	id: "status-line",
	kind: "status-line",
	routes: ["command.run", "command.describe"],
	needs: "2.1.314",
};

export const attachStatusLine = (on: On, _context: BlockContext): void => {
	// Answers `{ text }` with no `context`, so the built-in prompt never reaches the model.
	on("command.run", { command: STATUSLINE }, onStatuslineCommand);
	on("command.describe", { command: STATUSLINE }, onStatuslineDescribe);
};
