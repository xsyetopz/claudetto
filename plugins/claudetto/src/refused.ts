// A name alone is the fault: even `false` means the snippet writes a key it has no reason to name.

import { ENV, type KeyPin, SETTING, type Snippet } from "./keys.ts";

export const REFUSED_KEYS: readonly KeyPin[] = [
	// Stops every hook, claudetto's own included, so the framework would be inert.
	{ name: "disableAllHooks", kind: SETTING },
	// Stops the inline shell step of skills and commands, which claudetto's skills use.
	{ name: "disableSkillShellExecution", kind: SETTING },
	// Rejects `--plugin-dir`, which the hook lab and the capture load the plugin with.
	{ name: "disableSideloadFlags", kind: SETTING },
	// Removes the plugin source of slash commands, where claudetto's commands come from.
	{ name: "disableCommandPluginSources", kind: SETTING },
	{ name: "DISABLE_LOGIN_COMMAND", kind: ENV },
	{ name: "DISABLE_LOGOUT_COMMAND", kind: ENV },
	// Removes `/doctor`, the first thing to run when the CLI itself is wrong.
	{ name: "DISABLE_DOCTOR_COMMAND", kind: ENV },
	// Stops the updater, so a user would stay on the version claudetto was written against.
	{ name: "DISABLE_AUTOUPDATER", kind: ENV },
	{ name: "DISABLE_UPDATES", kind: ENV },
	// Removes `/upgrade`, the command that changes the plan the budget is read against.
	{ name: "DISABLE_UPGRADE_COMMAND", kind: ENV },
];

export const refusedNames = (): readonly string[] =>
	REFUSED_KEYS.map((row) => row.name);

/** Both halves are searched: a settings key written into the `env` block is still read. */
export const refusals = (snippet: Snippet): readonly string[] =>
	refusedNames().filter(
		(name) => name in snippet.env || name in snippet.settings,
	);
