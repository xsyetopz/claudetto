// Pure code: the edits that put the block into `.gitignore` and `.ignore`, and the text a person sees before a yes.

import { applyBlock, diffOf } from "./ignore-block";
import { ignoreLines } from "./ignore-plan";
import type { Listing } from "./starter";

export interface IgnoreEdit {
	readonly path: ".gitignore" | ".ignore";
	/** The file as read, or `undefined` when it does not exist. */
	readonly before: string | undefined;
	readonly after: string;
	/** The lines of the block, so the text can be rebuilt from the file as it is at the write. */
	readonly lines: readonly string[];
}

interface HeldIgnores {
	readonly gitignore?: string | undefined;
	readonly ignore?: string | undefined;
}

const editOf = (
	path: IgnoreEdit["path"],
	before: string | undefined,
	lines: readonly string[],
): IgnoreEdit[] => {
	const after = applyBlock(before, lines);
	return after === undefined || after === before
		? []
		: [{ path, before, after, lines }];
};

/** Only a file that changes is listed, so a rerun on a settled repo plans nothing. */
export const ignoreEdits = (
	listing: Listing,
	held: HeldIgnores,
): IgnoreEdit[] => {
	const lines = ignoreLines(listing);
	return [
		...editOf(".gitignore", held.gitignore, lines.gitignore),
		...editOf(".ignore", held.ignore, lines.ignore),
	];
};

export const previewEdits = (edits: readonly IgnoreEdit[]): string =>
	edits.map((edit) => diffOf(edit.path, edit.before, edit.after)).join("\n");

/** The text to write, from the file as it is now; `undefined` when it needs no write. */
export const settle = (
	edit: IgnoreEdit,
	current: string | undefined,
): string | undefined => {
	const text = applyBlock(current, edit.lines);
	return text === current ? undefined : text;
};
