import { MAIN_AGENT } from "../../plugins/claudetto/src/prompts.ts";
import type { CommandResult, CommandRunner } from "./command.ts";
import type { Arm } from "./plan.ts";

export const PLUGIN_DIR = "plugins/claudetto";

export const SESSION_MS = 600_000;

const ALLOWED_TOOLS = "Read,Edit,Write,Bash(bun *),Bash(git *)";

export interface SessionOptions {
	readonly prompt: string;
	readonly pluginDir: string;
	readonly model?: string;
	/** A cap on the spend of one session, in dollars. */
	readonly maxBudgetUsd?: number;
}

/** `--setting-sources project,local` leaves user settings out, so the arms differ by `--agent` alone. */
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
