// The memory files of setup: the global `~/.claude/CLAUDE.md` (design D21), its rule files, and the parent files that a project can exclude.
import { t } from "../prompts.ts";

const TRAILING_NEWLINE = /\n$/;

/** A `CLAUDE.md` outside the project that Claude Code can load: a file of a parent folder, or of a vendored package. */
export interface MemoryFile {
	path: string;
	kind: "parent" | "vendor";
	glob: string;
	excluded: boolean;
}

/** The rule file for test files that setup writes in `~/.claude/rules/`. */
export const TESTS_RULE = "claudetto-tests.md";

export const lineCount = (text: string): number =>
	text === "" ? 0 : text.replace(TRAILING_NEWLINE, "").split("\n").length;

/**
 * `text` of the global file with the origin line and the rules of claudetto between the comments, and each user line kept.
 * A file with no block gets one under its title, and a new file gets the title, the block, and the `rules` of the user (a later run leaves them as edited).
 */
export const withClaudeMdBlock = (
	text: string,
	rules: readonly string[],
): string => {
	const [start, end, title] = ["mdStart", "mdEnd", "mdTitle"].map((k) => t(k));
	const body = ["mdOrigin", "mdReport", "mdSource", "mdUserValue"].map((k) =>
		t(k),
	);
	const block = [start, ...body, end];
	if (text === "") {
		return `${[title, ...block, ...(rules.length > 0 ? ["", ...rules] : [])].join("\n")}\n`;
	}
	const lines = text.split("\n");
	const from = lines.findIndex((l) => l.trim() === start);
	const to = lines.findIndex((l, i) => i > from && l.trim() === end);
	// A start comment with no end comment gets the end comment after the new body.
	if (from >= 0) {
		return [
			...lines.slice(0, from + 1),
			...body,
			...(to > from ? lines.slice(to) : [end, ...lines.slice(from + 1)]),
		].join("\n");
	}
	if (lines[0]?.trim() === title) {
		return [lines[0], ...block, ...lines.slice(1)].join("\n");
	}
	return [title, ...block, "", ...lines].join("\n");
};

/** The installer that setup knows: its rule files, the skill that it writes with them, and its removal command. */
const OWNER = {
	owner: "ctx7",
	rule: /^context7.*\.md$/i,
	skill: "find-docs",
	removal: "ctx7 remove --claude --cli",
};

/**
 * The inventory rows of the rule files `rules`, as `[name, characters]`.
 * A file of the known owner stays the owner's, and gets the removal command only when `docsOn` (the skill `claudetto:find-docs` does the same job).
 * `TESTS_RULE` is the file of claudetto setup, with no offer.
 * Another file gets the offer to fold it into the global file or remove it.
 */
export const ruleRows = (
	rules: [string, number][],
	userSkills: string[],
	docsOn: boolean,
) =>
	rules.map(([name, chars]) => {
		const file = `rules/${name}`;
		if (name === TESTS_RULE) {
			return { file, chars, owner: "claudetto" };
		}
		const known = OWNER.rule.test(name) && userSkills.includes(OWNER.skill);
		return {
			file,
			chars,
			...(known && { owner: OWNER.owner }),
			...(known && docsOn && { removal: OWNER.removal, note: t("ruleEdits") }),
			...(!known && { foldOrRemove: true }),
		};
	});
