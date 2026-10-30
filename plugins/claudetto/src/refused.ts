// Every row was read in the installed `2.1.312` with `cc-inspect surface` on 2026-10-28. A name
// alone is the fault: a value of `false` for one of these is harmless but means the snippet is
// writing a key it has no reason to name, so the check reports the name either way.

import { ENV, type KeyPin, SETTING, type Snippet } from "./keys.ts";

/** The keys claudetto must never write, each read in the installed build; one in a snippet is a fault whatever its value. */
export const REFUSED_KEYS: readonly KeyPin[] = [
	// Stops every hook of every settings file and plugin, claudetto's own included, so the whole
	// framework would be inert while its settings claimed otherwise.
	{ name: "disableAllHooks", kind: SETTING },
	// Stops the inline shell step of a skill or a custom slash command, which claudetto's skills use.
	{ name: "disableSkillShellExecution", kind: SETTING },
	// Rejects `--plugin-dir`, `--plugin-url`, `--agents`, and `--mcp-config`. The hook lab and the
	// capture both load the plugin with `--plugin-dir`, so this key would break the checks as well.
	{ name: "disableSideloadFlags", kind: SETTING },
	// Removes the plugin source of slash commands, which is where claudetto's own commands come from.
	{ name: "disableCommandPluginSources", kind: SETTING },
	// Removes `/login`, the gate of which is `!i.DISABLE_LOGIN_COMMAND` (`chunk-r5cyd28m.js:1721781`).
	{ name: "DISABLE_LOGIN_COMMAND", kind: ENV },
	// Removes `/logout` (`chunk-r5cyd28m.js:1722122`).
	{ name: "DISABLE_LOGOUT_COMMAND", kind: ENV },
	// Removes `/doctor` (`chunk-ktc61wsq.js:162624`), which is the first thing to run when the CLI
	// itself is wrong.
	{ name: "DISABLE_DOCTOR_COMMAND", kind: ENV },
	// Stops the updater, so a user would stay on the version claudetto was written against.
	{ name: "DISABLE_AUTOUPDATER", kind: ENV },
	{ name: "DISABLE_UPDATES", kind: ENV },
	// Removes `/upgrade`, the command that changes the plan the whole budget of claudetto is read
	// against.
	{ name: "DISABLE_UPGRADE_COMMAND", kind: ENV },
];

/** The names claudetto refuses, in the order of the rows. */
export const refusedNames = (): readonly string[] =>
	REFUSED_KEYS.map((row) => row.name);

/**
 * The refused names a snippet holds, in the order of the rows. An empty list is a snippet that may
 * be written. Both halves are searched, because a settings key written into the `env` block is still
 * a key the harness reads.
 */
export const refusals = (snippet: Snippet): readonly string[] =>
	refusedNames().filter(
		(name) => name in snippet.env || name in snippet.settings,
	);
