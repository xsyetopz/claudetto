// The arms differ in one flag. Both load the plugin folder, so the hooks, the deny list, and the tool
// set are the same; only `--agent` selects `agents/main.md`, and without it the file is unread
// (`docs/prompt/footprint.md`, "What the Harness Sends"). User settings are skipped, so an `agent`
// key of this machine reaches neither arm.

import { MAIN_AGENT } from "../../plugins/claudetto/src/prompts.ts";
import type { CommandResult, CommandRunner } from "./command.ts";
import type { Arm } from "./plan.ts";

/** The plugin folder of the tree, loaded for the session only with `--plugin-dir`. */
export const PLUGIN_DIR = "plugins/claudetto";

/** How long one session may run before it is killed. */
export const SESSION_MS = 600_000;

/** The tools a session may use without a prompt: edits, and `bun` and `git` in the scratch repository. */
const ALLOWED_TOOLS = "Read,Edit,Write,Bash(bun *),Bash(git *)";

/** What one session is given: the user's prompt, the plugin folder, and an optional model and spend cap. */
export interface SessionOptions {
	readonly prompt: string;
	/** The absolute path of the plugin folder. */
	readonly pluginDir: string;
	readonly model?: string;
	/** A cap on the spend of one session, in dollars. */
	readonly maxBudgetUsd?: number;
}

/**
 * The command one arm of a case runs. `--setting-sources project,local` leaves the user's own
 * settings out while keeping the two the scratch repository writes, so an `agent` key of this machine
 * reaches neither arm and the arms differ by `--agent` alone.
 */
export const sessionArgv = (
	arm: Arm,
	options: SessionOptions,
): readonly string[] => {
	const argv = [
		"claude",
		"-p",
		options.prompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--no-session-persistence",
		"--setting-sources",
		"project,local",
		"--permission-mode",
		"acceptEdits",
		"--permission-prompts",
		"none",
		"--allowedTools",
		ALLOWED_TOOLS,
		"--plugin-dir",
		options.pluginDir,
	];
	if (arm === "main.md") {
		argv.push("--agent", MAIN_AGENT);
	}
	if (options.model !== undefined) {
		argv.push("--model", options.model);
	}
	if (options.maxBudgetUsd !== undefined) {
		argv.push("--max-budget-usd", String(options.maxBudgetUsd));
	}
	return argv;
};

/** Runs one session in `cwd` through `run`. This is the only call that can reach a model. */
export const runSession = (
	run: CommandRunner,
	arm: Arm,
	options: SessionOptions & { readonly cwd: string },
): Promise<CommandResult> =>
	run(sessionArgv(arm, options), { cwd: options.cwd, timeoutMs: SESSION_MS });
