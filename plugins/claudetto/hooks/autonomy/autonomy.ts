import type { PluginOptions } from "claude-code";

import { indentOf, isRecord, parseSettings } from "../settings/settings";

/**
 * The built-in key full autonomy turns on. With it, Claude Code denies each call
 * that would wait on a permission prompt, drops AskUserQuestion, EnterPlanMode
 * and ExitPlanMode, and cancels unanswered MCP elicitations, in interactive
 * sessions, `-p` runs, subagents and agent teams (settings reference, 2.1.319+).
 * Only user or managed settings and `--settings` can set it, not a plugin
 * manifest, so the option writes it to user settings.
 */
export const AUTONOMY_KEY = "denyInsteadOfPrompting";

/** Store key that marks the key as claudetto's, so semi removes only what full wrote. */
export const AUTONOMY_MARK = "autonomy.wrote";

/** What the person reads after a session start changed the key. */
export const AUTONOMY_ON =
	"claudetto: autonomy is full, so it set permissions.denyInsteadOfPrompting in user settings: " +
	"calls that would wait on a prompt are denied and questions are off. Set autonomy to semi in /config to undo.";
/** What the person reads after semi removed the key full had written. */
export const AUTONOMY_OFF =
	"claudetto: autonomy is semi, so it removed the permissions.denyInsteadOfPrompting it had set: prompts and questions are back.";

/**
 * Whether claudetto's `autonomy` option asks for full autonomy. Semi, the
 * default, leaves prompts and questions as Claude Code shows them.
 *
 * @param options The plugin's options from `/config`.
 * @returns True only for the value `full`.
 */
export const isFull = (options: PluginOptions): boolean =>
	options["autonomy"] === "full";

/** The outcome of matching user settings to the autonomy option. */
export interface AutonomySync {
	/** The settings text to write; equal to the input when nothing changed. */
	readonly text: string;
	/** Whether claudetto owns the key after this change. */
	readonly owned: boolean;
	/** The notice for the person, or undefined when nothing changed. */
	readonly notice?: string;
}

/**
 * Matches `permissions.denyInsteadOfPrompting` in user settings to the
 * autonomy option. Full sets it when unset; semi removes it only when full
 * wrote it. A value the person set is never touched.
 *
 * @param text The user settings text.
 * @param full Whether the option is full.
 * @param owned Whether claudetto wrote the key in an earlier session.
 * @returns The text to write, the new ownership, and the notice to show.
 */
export function syncAutonomy(
	text: string,
	full: boolean,
	owned: boolean
): AutonomySync {
	const settings = parseSettings(text);
	if (settings === undefined) {
		return { text, owned };
	}
	const permissions = isRecord(settings["permissions"])
		? settings["permissions"]
		: {};
	const current = permissions[AUTONOMY_KEY];
	const write = (next: Record<string, unknown>): string =>
		`${JSON.stringify({ ...settings, permissions: next }, undefined, indentOf(text))}\n`;
	if (full) {
		if (current !== undefined) {
			// The person's own value wins; a key claudetto wrote stays claudetto's.
			return { text, owned: owned && current === true };
		}
		return {
			text: write({ ...permissions, [AUTONOMY_KEY]: true }),
			owned: true,
			notice: AUTONOMY_ON
		};
	}
	if (!owned || current !== true) {
		return { text, owned: false };
	}
	const { [AUTONOMY_KEY]: _removed, ...rest } = permissions;
	return { text: write(rest), owned: false, notice: AUTONOMY_OFF };
}
