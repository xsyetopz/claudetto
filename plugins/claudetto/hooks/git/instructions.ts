import type { EngineInterface, On, PluginOptions } from "claude-code";
import { fault } from "../fault";

/**
 * How Claude Code 2.1.327 reads `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`, in any
 * case: "1", "true", "yes" or "on" disables the builtin block, "0", "false",
 * "no" or "off" keeps it, and any other value defers to the setting.
 */
const TRUTHY = /^(?:1|true|yes|on)$/iu;
const FALSY = /^(?:0|false|no|off)$/iu;

/** The env's verdict on the builtin block, or the setting when the env has none. */
async function builtinSwitch($: EngineInterface): Promise<boolean | undefined> {
	const value = (await $.env.get("CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS"))?.trim() ?? "";
	if (TRUTHY.test(value)) return false;
	if (FALSY.test(value)) return true;
	const setting = await $.settings.read({ key: "includeGitInstructions" });
	return typeof setting === "boolean" ? setting : undefined;
}

/**
 * Whether Claude Code's own git instructions are on. The engine checks the env
 * first and then `includeGitInstructions`, which defaults to true. The one
 * switch also drops the attribution reminder, so claudetto's block carries
 * the attribution lines itself.
 *
 * @param $ The engine.
 * @returns True when the builtin `# Git` block and attribution reminder are sent.
 */
export async function builtinGitOn($: EngineInterface): Promise<boolean> {
	return (await builtinSwitch($)) !== false;
}

/**
 * Whether Claude Code's own git instructions are turned on explicitly: the env
 * keeps them with a false value, or a settings source sets `includeGitInstructions`
 * to true. An unset switch defaults to on but is not a choice the user made.
 *
 * @param $ The engine.
 * @returns True when the user or a higher settings source asked for the builtin block.
 */
export async function builtinGitForced($: EngineInterface): Promise<boolean> {
	return (await builtinSwitch($)) === true;
}

/** Whether claudetto's `includeGitInstructions` option is on; it is opt-out. */
export const ownGitOn = (options: PluginOptions): boolean => options["includeGitInstructions"] !== false;

/** One attribution bullet: a single line inline, several lines as a block below. */
const ending = (place: string, text: unknown): string[] => {
	if (typeof text !== "string" || text.trim() === "") return [];
	return text.includes("\n") ? [`- End each ${place} with these lines:\n${text}`] : [`- End each ${place} with the line \`${text}\`.`];
};

/**
 * claudetto's git block for the Bash description. It replaces the builtin
 * one and keeps its rules, said shorter. The attribution lines come from
 * `attribution.commit` and `attribution.pr`; an unset or empty one adds no
 * bullet, as no default is copied from Claude Code.
 *
 * @param attribution The `attribution` setting as read.
 * @returns The block, starting with a blank line.
 */
export const gitBlock = (attribution: unknown): string => {
	const lines = attribution !== null && typeof attribution === "object" ? (attribution as { commit?: unknown; pr?: unknown }) : {};
	return [
		"",
		"",
		"# Git",
		"- Use `gh` for GitHub work, and run git and `gh` without interactive flags such as `-i`, because no one can answer an editor or a prompt here.",
		"- Commit or push when the user asks, on a new branch when the current one is the default branch.",
		"- Keep files that likely hold secrets (`.env`, `credentials.json`, `.claude/settings.local.json`) out of commits, and warn the user when they ask to commit one.",
		"- Write `@name` only for a real GitHub login you mean to notify, because GitHub notifies it; put roles, placeholders and code in backticks.",
		...ending("commit message", lines.commit),
		...ending("pull request description", lines.pr),
	].join("\n");
};

/** The session-start notice when both claudetto's and the builtin git instructions are on. */
export const GIT_CONFLICT =
	"claudetto: Claude Code's own git instructions are on (includeGitInstructions or CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS), so claudetto's shorter ones stay out to keep one set. Set includeGitInstructions to false in settings to use claudetto's, or turn off claudetto's includeGitInstructions option to keep the builtin ones.";

/**
 * Appends claudetto's git block to the Bash description when its option is on
 * and the builtin block is off. With both on, the builtin block stays alone
 * and session start reports the conflict.
 */
export function registerGit(on: On, options: PluginOptions = {}): void {
	if (!ownGitOn(options)) return;
	on("tool.describe", { tool: "Bash" }, async ($, e, next) => {
		const result = await next(e);
		if (await builtinGitOn($)) return result;
		const attribution = await $.settings.read({ key: "attribution" });
		return { ...result, description: `${result.description}${gitBlock(attribution)}` };
	}).catch(($, e, next) => (fault($, "git instructions", next.error), next(e)));
}
