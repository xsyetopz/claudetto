// The facts that the rules of the `notes` slice read: the settings file that holds a rule, a field of a tool input, and a change of the user.

import { userEdits } from "../../../project/domain/edits.ts";
import {
	PROJECT_LOCAL_SETTINGS,
	PROJECT_SETTINGS,
} from "../../../project/domain/paths.ts";
import type { Note } from "../../domain/notes.ts";
import { USER_EDIT_NOTE } from "../prompts.ts";

const PARENT_DIR = /\/[^/]*$/;

/** What the rules read of the session: the reads of `mod.ts`, so that `$` stays in the hook's own file. */
export interface Reads {
	read: (file: string) => Promise<string>;
	root: () => Promise<string>;
}

/** What `userEdits` reads, with `git` run in the folder `dir`. */
export type EditReads = Omit<Parameters<typeof userEdits>[0], "git"> & {
	git: (
		dir: string,
		args: string[],
	) => ReturnType<Parameters<typeof userEdits>[0]["git"]>;
};

/** The first of `files` under `root` that holds `rule`, read in order, or `null`. */
const holding = async (
	reads: Reads,
	root: string,
	rule: string,
	files: readonly string[],
): Promise<string | null> => {
	const [file, ...rest] = files;
	if (file === undefined) {
		return null;
	}
	const text = await reads.read(`${root}/${file}`).catch(() => "");
	return text.includes(rule) ? file : holding(reads, root, rule, rest);
};

/** The settings file of the project that holds `rule`, or a generic name. */
export const settingsOf = async (
	reads: Reads,
	rule: string,
): Promise<string> => {
	const root = await reads.root().catch(() => "");
	return (
		(await holding(reads, root, rule, [
			PROJECT_LOCAL_SETTINGS,
			PROJECT_SETTINGS,
		])) ?? "your settings files"
	);
};

/** The field `key` of a tool input, or `undefined` when the input is no object. */
export const fieldOf = (input: unknown, key: string): unknown =>
	typeof input === "object" && input !== null
		? Object.entries(input).find(([k]) => k === key)?.[1]
		: undefined;

/** The path of an `Edit` or `Write` that has a change which no session made, as `git status` shows it, else `null`. The ledger is the value of the store that `hygiene` writes. */
const userEdited = async (
	reads: EditReads,
	path: string,
): Promise<string | null> => {
	const dir = path.replace(PARENT_DIR, "") || "/";
	const [rel] = await userEdits(
		{ ...reads, git: (args) => reads.git(dir, args) },
		path,
	);
	return rel ?? null;
};

/** The rule "user edit": the note for an allowed `Edit` or `Write` of a file with a change of the user, else `null`. A failure of the rule gives none. */
export const userEditNote = async (
	reads: EditReads,
	tool: string,
	input: unknown,
): Promise<Note | null> => {
	const path = fieldOf(input, "file_path");
	if ((tool !== "Edit" && tool !== "Write") || typeof path !== "string") {
		return null;
	}
	const rel = await userEdited(reads, path).catch(() => null);
	return rel ? USER_EDIT_NOTE({ path: rel }) : null;
};
