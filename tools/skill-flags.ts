// Measured on 2026-10-29 with `just capture --arm plugin --shipped`: a planted skill carrying
// `disable-model-invocation: true` left the request at 28,993 characters with neither its name nor
// its description in the body, and the same skill without the flag put one line in the skill
// listing and cost 70 characters of `messages`.

import { stat } from "node:fs/promises";
import { file as bunFile, Glob } from "bun";
import { bare, tableRows } from "./md-table.ts";

/** The heading the skill table sits under. */
export const SKILL_HEADING = "### The Skills and Their Flags";

/** Where the skills of the plugin live. */
export const SKILL_ROOT = "plugins/claudetto/skills";

/** The front-matter key that keeps a skill out of the request. */
export const MANUAL_KEY = "disable-model-invocation: true";

/** One row of the skill table: the skill, whether the model may start it, and the reason. */
export interface SkillRow {
	/** The folder name of the skill, which is the name the listing shows. */
	readonly skill: string;
	/** Whether the model is meant to start it, so the description has to be in context. */
	readonly modelMayCall: boolean;
	/** Why the model needs it, or why it is for the user alone. */
	readonly reason: string;
}

/** One skill folder as found on disk, with whether its `SKILL.md` disables model invocation. */
export interface SkillFile {
	readonly skill: string;
	/** Whether `SKILL.md` carries `disable-model-invocation: true`. */
	readonly manual: boolean;
}

const YES = "yes";

/** Whether a folder is there. */
const exists = async (root: string): Promise<boolean> => {
	try {
		return (await stat(root)).isDirectory();
	} catch {
		return false;
	}
};

/** The skill rows of a page, read from the table under `heading`. */
export const parseSkillRows = (
	page: string,
	heading = SKILL_HEADING,
): readonly SkillRow[] =>
	tableRows(page, heading)
		.filter((cells) => cells.length >= 3)
		.map((cells) => ({
			skill: bare(cells[0] ?? ""),
			modelMayCall: bare(cells[1] ?? "").toLowerCase() === YES,
			reason: cells[2] ?? "",
		}));

/** The page that holds the table. */
export const SKILL_PAGE = "docs/prompt/footprint.md";

/**
 * Reads the page and parses it. The parse itself is `parseSkillRows`, apart from this so that a test
 * reaches it with planted text and never touches the real page.
 */
export const readSkillRows = async (
	page = SKILL_PAGE,
): Promise<readonly SkillRow[]> => parseSkillRows(await bunFile(page).text());

/**
 * Every `SKILL.md` under `root`, with the flag each one carries. A tree with no `skills` folder has
 * no skill, which is the state of the new tree, so a missing folder is empty and not an error.
 */
export const readSkillFiles = async (
	root = SKILL_ROOT,
): Promise<readonly SkillFile[]> => {
	if (!(await exists(root))) {
		return [];
	}
	const files: SkillFile[] = [];
	for await (const path of new Glob("*/SKILL.md").scan({ cwd: root })) {
		const skill = path.split("/")[0] ?? "";
		const text = await bunFile(`${root}/${path}`).text();
		files.push({ skill, manual: text.includes(MANUAL_KEY) });
	}
	return files.sort((a, b) => a.skill.localeCompare(b.skill));
};

/** Where the decision pages of the skills live. */
export const KEEP_ROOT = "docs/keep/skills";

/** The decisions that leave a skill in the tree. */
const SHIPPING_DECISIONS: readonly string[] = ["keep", "name-only"];

/** What ends the first word of a decision line, so that `drop as a skill` and `keep, because` both split. */
const FIRST_WORD_END = /[\s,]/;

/** The value of the line that starts with `key`, or `undefined` when the page has none. */
const fieldOf = (page: string, key: string): string | undefined =>
	page
		.split("\n")
		.find((line) => line.startsWith(`${key}: `))
		?.slice(key.length + 2)
		.trim();

/**
 * Whether a decision page says its skill ships. Only a skill of ours has a folder to ship. The
 * `USER DECISION` line outranks the `RECOMMENDATION` line, and the first word of the winner is
 * `keep` or `name-only` for a skill that stays.
 */
export const pageShips = (page: string): boolean => {
	if (fieldOf(page, "SET") !== "ours") {
		return false;
	}
	const decision =
		fieldOf(page, "USER DECISION") ?? fieldOf(page, "RECOMMENDATION") ?? "";
	const word = (decision.split(FIRST_WORD_END)[0] ?? "").toLowerCase();
	return SHIPPING_DECISIONS.includes(word);
};

/** The skills that the decision pages under `root` mark as shipping, sorted. */
export const readShippingSkills = async (
	root = KEEP_ROOT,
): Promise<readonly string[]> => {
	const names: string[] = [];
	for await (const path of new Glob("*.txt").scan({ cwd: root })) {
		if (pageShips(await bunFile(`${root}/${path}`).text())) {
			names.push(path.slice(0, -".txt".length));
		}
	}
	return names.sort((a, b) => a.localeCompare(b));
};

/**
 * One line per skill that a decision page marks as shipping and the tree lacks. This is what makes
 * a tree with no skill at all a fault, and a removal is recorded on the decision page alone.
 */
export const shippingFaults = (
	shipping: readonly string[],
	files: readonly SkillFile[],
): readonly string[] => {
	const named = new Set(files.map((file) => file.skill));
	return shipping
		.filter((skill) => !named.has(skill))
		.map(
			(skill) =>
				`${skill} ships by its decision page in ${KEEP_ROOT} and has no ${SKILL_ROOT}/${skill}/SKILL.md`,
		);
};

const fileFault = (
	file: SkillFile,
	rows: readonly SkillRow[],
	page: string,
): string | undefined => {
	const row = rows.find((entry) => entry.skill === file.skill);
	if (row === undefined) {
		return `${file.skill} has no row in the table "${SKILL_HEADING}" of ${page}`;
	}
	if (row.reason === "") {
		return `${file.skill} has a row with no reason`;
	}
	if (row.modelMayCall && file.manual) {
		return `${file.skill} is a skill the model may call, and its SKILL.md sets ${MANUAL_KEY}`;
	}
	return !row.modelMayCall && !file.manual
		? `${file.skill} is a skill the model need not call, and its SKILL.md does not set ${MANUAL_KEY}`
		: undefined;
};

/**
 * The faults of the skill set, one line per skill. An empty list is a skill set that may ship. A row
 * with no file is a fault too, because the table would claim a skill no session loads.
 */
export const skillFaults = (
	rows: readonly SkillRow[],
	files: readonly SkillFile[],
	page = SKILL_PAGE,
): readonly string[] => {
	const named = new Set(files.map((file) => file.skill));
	const missing = rows
		.filter((row) => !named.has(row.skill))
		.map(
			(row) =>
				`${row.skill} has a row and no ${SKILL_ROOT}/${row.skill}/SKILL.md`,
		);
	const faults = files
		.map((file) => fileFault(file, rows, page))
		.filter((line): line is string => line !== undefined);
	return [...faults, ...missing];
};
