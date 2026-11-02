import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";
import { onSetupCommand } from "../settings-commands.ts";
import { withNotes } from "./notes.ts";
import { SETUP_COMMAND } from "./setup.ts";

export const setupCommand: Block = {
	id: "setup-command",
	kind: "command",
	routes: ["command.run", "ui.render"],
	needs: "2.1.314",
};

export const attachSetupCommand = (on: On, _context: BlockContext): void => {
	// The dialogs open from the hook, so the command takes no model turn and no tool schema.
	on("command.run", { command: SETUP_COMMAND }, onSetupCommand);

	// The notes ride the dialog's props only; the model's request carries none of them.
	on("ui.render", { component: ["AskUserQuestion"] }, (_$, e, next) =>
		next({
			...e,
			props: { ...e.props, questions: withNotes(e.props.questions) },
		}),
	);
};
