// The general rules reach a session only from the user's `CLAUDE.md`, which every session reads, so the
// user sees and chooses each word that `/claudetto:setup` writes there.

import { SETTINGS_FILE } from "../../settings-file.ts";

export const GENERAL_RULES = `Check each change with the narrowest check the repo's own scripts provide: one test file or one package for a code change. A comment, typo, or docs edit needs no test or build run. Run the full suite once, before the report, when the change alters behavior.
Take each flag, option, and version from \`--help\` or the versioned docs read in this session.
Read the source or run a probe before you state a fact about a tool.`;

const TRAILING_NEWLINES = /\n*$/;

export const SECTION_START = "<!-- claudetto:start -->";

export const SECTION_END = "<!-- claudetto:end -->";

export const GENERAL_SECTION = `${SECTION_START}\n${GENERAL_RULES}\n${SECTION_END}`;

/** Claude Code reads the user's own `CLAUDE.md` beside the user settings file. */
export const userClaudeMdFile = (settingsFile: string): string =>
	`${settingsFile.slice(0, -SETTINGS_FILE.length)}CLAUDE.md`;

/** The marked section of `text`, start and end markers included, or `undefined` when it has none. */
export const sectionOf = (text: string | undefined): string | undefined => {
	const start = text?.indexOf(SECTION_START) ?? -1;
	const end = text?.indexOf(SECTION_END, start) ?? -1;
	return text === undefined || start < 0 || end < 0
		? undefined
		: text.slice(start, end + SECTION_END.length);
};

/** `held` with the shipped section in place of its own, or appended after a blank line, so the rest stays as it was. */
export const withSection = (held: string | undefined): string => {
	const own = sectionOf(held);
	if (held === undefined || held.trim() === "") {
		return `${GENERAL_SECTION}\n`;
	}
	if (own !== undefined) {
		return held.replace(own, () => GENERAL_SECTION);
	}
	return `${held.replace(TRAILING_NEWLINES, "")}\n\n${GENERAL_SECTION}\n`;
};
