import type { On, PluginOptions, ToolCheckResult } from "claude-code";
import { fault } from "../../shared/fault";
import { gateCommit } from "./commit";
import { limitCommand, minutes } from "./limit";
import { closeStdin } from "./stdin";

/**
 * Matches a command that names git. Claude Code refuses a git command in a
 * worktree-isolated agent when it is more than a plain list of commands or
 * when an interpreter such as perl runs before git, and the stdin group and the
 * watchdog both add that. Such a command keeps only pipefail, a plain line.
 */
const NAMES_GIT = /\bgit\b/;

/**
 * Wraps the model's Bash command in claudetto's guards: stdin from /dev/null
 * (RISK-488), a wall-time limit (RISK-056) and pipefail before a commit or push
 * (RISK-104). A command that names git skips the first two (RISK-499).
 *
 * @param command The Bash command as the model wrote it.
 * @param limit The time limit in minutes; 0 leaves it out.
 * @returns The command as it reaches the shell.
 */
export const guardCommand = (command: string, limit: number): string => {
	if (NAMES_GIT.test(command)) return gateCommit(command);
	const closed = closeStdin(command);
	return gateCommit(limit === 0 ? closed : limitCommand(closed, limit * 60));
};

/**
 * Registers the Bash rewrite and keeps it out of the permission decision.
 * Claude Code checks the rewritten command, and its parser asks about a brace
 * group or a quoted brace, so a wrapped call would always need approval. The
 * guard therefore wraps only a command that the session already allows as the
 * model wrote it, and answers the check of the wrapped call with that verdict.
 * A command that needs approval runs unwrapped, so the dialog, a saved rule and
 * the auto mode classifier all see the model's own command.
 */
export function registerShell(on: On, options: PluginOptions = {}): void {
	const limit = minutes(options["bashTimeLimitMinutes"]);
	const allowed = new Map<string, ToolCheckResult>();
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		const id = e.tool_use_id;
		if (e.tool !== "Bash" || id === undefined) return next(e);
		const verdict = await $.tool.check({ tool: "Bash", input: { command: e.command } });
		if (verdict.decision !== "allow") return next(e);
		allowed.set(id, verdict);
		try {
			return await next({ ...e, command: guardCommand(e.command, limit) });
		} finally {
			allowed.delete(id);
		}
	}).catch(($, e, next) => (fault($, "shell guard", next.error), next(e)));
	on("tool.check", { tool: "Bash" }, (_$, e, next) => {
		const verdict = e.tool_use_id === undefined ? undefined : allowed.get(e.tool_use_id);
		return verdict ?? next(e);
	}).catch(($, e, next) => (fault($, "shell check", next.error), next(e)));
}
