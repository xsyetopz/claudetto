import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** Drops one leading tab from each line that has one. */
const dropTab = (text: string): string => text.replaceAll(/^\t/gmu, "");

/**
 * The Edit strings with the Read prefix's tab taken out, or undefined when
 * they need no change. Read shows each line as its number, a tab, then the
 * line, and a model that copies a tab-indented line can keep that separator
 * tab, so every line of `old_string` carries one tab too many and the Edit
 * fails as not found. The fix applies only when each non-empty line of
 * `old_string` starts with a tab, the file lacks `old_string` as written, and
 * holds the shortened text once (or the call replaces all). `new_string` loses
 * the same tab, so the replacement keeps the file's indentation.
 *
 * @param file The file's text.
 * @param oldText The `old_string` as the model wrote it.
 * @param newText The `new_string` as the model wrote it.
 * @param all Whether the call replaces every occurrence.
 * @returns Both strings with one tab dropped per line, or undefined.
 */
export const readPrefixFix = (
	file: string,
	oldText: string,
	newText: string,
	all: boolean
): { old: string; new: string } | undefined => {
	const lines = oldText.split("\n").filter((line) => line !== "");
	if (
		lines.length === 0 ||
		!lines.every((line) => line.startsWith("\t")) ||
		file.includes(oldText)
	) {
		return undefined;
	}
	const old = dropTab(oldText);
	const count = file.split(old).length - 1;
	return count === 1 || (all && count > 1)
		? { old, new: dropTab(newText) }
		: undefined;
};

/** The note the model reads after a fixed Edit, so its next Edit drops the tab itself. */
export const TAB_NOTE =
	"Your old_string and new_string each had one leading tab too many on every line (the tab that follows the line number in Read output), so the edit ran with that tab dropped. Copy the indentation from after that tab.";

/**
 * Fixes an Edit whose strings carry the Read prefix's tab (REQ-EDIT-003).
 * Sonnet 5.5 sent such a first Edit in 6 of 6 runs on a tab-indented file;
 * each failed as not found and cost a turn, and in a dogfood session the
 * retry wrote the extra tab into the file.
 */
export function registerTabs(on: On): void {
	on("tool.call", { tool: "Edit" }, async ($, e, next) => {
		if (e.tool !== "Edit" || !e.old_string.startsWith("\t")) {
			return next(e);
		}
		const file = await $.fs.read(e.file_path);
		const fix =
			typeof file === "string"
				? readPrefixFix(
						file,
						e.old_string,
						e.new_string,
						e.replace_all === true
					)
				: undefined;
		if (fix === undefined) {
			return next(e);
		}
		const r = await next({ ...e, old_string: fix.old, new_string: fix.new });
		return r.deny !== undefined || r.isError === true
			? r
			: { ...r, context: [...(r.context ?? []), TAB_NOTE] };
	}).catch(($, e, next) => {
		fault($, "edit tab fix", next.error);
		return next(e);
	});
}
