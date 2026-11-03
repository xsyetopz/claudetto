// The general rules reach a session from one of two places: the user's `CLAUDE.md` once setup wrote
// them there, or the `SessionStart` text, so a session never carries them twice.

import { SETTINGS_FILE } from "../../settings-file.ts";

export const GENERAL_RULES = `Run each build, test, lint, type check, and package step through the repo's own script in \`package.json\` or the \`justfile\`.
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
