import {
	agent,
	allowedTools,
	claudeArgv,
	maxBudget,
	model,
	NO_SESSION_PERSISTENCE,
	outputFormat,
	permissionMode,
	pluginDir,
	print,
	settingSources,
} from "../../claudekit/session/argv.ts";
import type {
	CommandResult,
	CommandRunner,
} from "../../claudekit/session/command.ts";
import { MAIN_AGENT } from "../../plugins/claudetto/src/prompts.ts";
import type { Arm } from "./plan.ts";

/** The plugin folder of the tree, relative to its root, loaded for the session only with `--plugin-dir`. */
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
): readonly string[] =>
	claudeArgv(
		print(options.prompt),
		outputFormat("stream-json"),
		NO_SESSION_PERSISTENCE,
		settingSources("project", "local"),
		permissionMode("acceptEdits"),
		["--permission-prompts", "none"],
		allowedTools(ALLOWED_TOOLS),
		pluginDir(options.pluginDir),
		arm === "main.md" ? agent(MAIN_AGENT) : [],
		options.model === undefined ? [] : model(options.model),
		options.maxBudgetUsd === undefined ? [] : maxBudget(options.maxBudgetUsd),
	);

/** Runs one session in `cwd` through `run`. This is the only call that can reach a model. */
export const runSession = (
	run: CommandRunner,
	arm: Arm,
	options: SessionOptions & { readonly cwd: string },
): Promise<CommandResult> =>
	run(sessionArgv(arm, options), { cwd: options.cwd, timeoutMs: SESSION_MS });
