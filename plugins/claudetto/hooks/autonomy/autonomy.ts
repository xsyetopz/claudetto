import { indentOf, isRecord, parseSettings } from "../settings/settings";

/**
 * The built-in Claude Code key that earlier claudetto releases wrote to user
 * settings from a plugin option of their own. Claude Code owns it, so claudetto
 * writes it no more and only removes the copy it wrote.
 */
export const DENY_KEY = "denyInsteadOfPrompting";

/** Store key that marks the key as claudetto's, so cleanup removes only what claudetto wrote. */
export const WROTE_MARK = "autonomy.wrote";

/** What the person reads after session start removed the key claudetto had written. */
export const RETIRED_NOTICE =
	"claudetto removed the permissions.denyInsteadOfPrompting it had written to user settings. " +
	"Claude Code owns that setting: set permissions.defaultMode and " +
	"permissions.denyInsteadOfPrompting in ~/.claude/settings.json " +
	"(https://code.claude.com/docs/en/settings-reference).";

/** The outcome of retiring the key claudetto wrote. */
export interface RetiredKey {
	/** The settings text to write; equal to the input when nothing changed. */
	readonly text: string;
	/** Whether claudetto still owns the key after this change; always false. */
	readonly owned: false;
	/** The notice for the person, or undefined when nothing changed. */
	readonly notice?: string;
}

/**
 * Removes `permissions.denyInsteadOfPrompting` from user settings when claudetto
 * wrote it (the mark is set) and it still holds `true`. A key the person set
 * (no mark) or changed is never touched.
 *
 * @param text The user settings text.
 * @param owned Whether the store mark says claudetto wrote the key.
 * @returns The text to write, the cleared ownership, and the notice to show.
 */
export function retireDenyKey(text: string, owned: boolean): RetiredKey {
	const settings = parseSettings(text);
	if (settings === undefined || !owned) {
		return { text, owned: false };
	}
	const permissions = isRecord(settings["permissions"])
		? settings["permissions"]
		: {};
	if (permissions[DENY_KEY] !== true) {
		return { text, owned: false };
	}
	const { [DENY_KEY]: _removed, ...rest } = permissions;
	const next = `${JSON.stringify({ ...settings, permissions: rest }, undefined, indentOf(text))}\n`;
	return { text: next, owned: false, notice: RETIRED_NOTICE };
}
