import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { file } from "bun";
import { gitLines, readListing } from "../cli.ts";
import { type IgnoreEdit, ignoreEdits, previewEdits, settle } from "./files.ts";

const readOr = async (path: string): Promise<string | undefined> => {
	const held = file(path);
	return (await held.exists()) ? await held.text() : undefined;
};

/** Rebuilds the text from the file as it is now, so a line added since the plan survives. */
const writeEdit = async (cwd: string, edit: IgnoreEdit): Promise<string> => {
	const path = join(cwd, edit.path);
	try {
		const text = settle(edit, await readOr(path));
		if (text === undefined) {
			return `\`${edit.path}\` needs no change.`;
		}
		await writeFile(path, text);
		return `Wrote \`${edit.path}\`.`;
	} catch (error) {
		return `Could not write \`${edit.path}\` (${String(error)}).`;
	}
};

/** The marked block of `.gitignore` and `.ignore`, shown as a diff and written after a yes. */
export const offerIgnores = async (
	cwd: string,
	options: { readonly dryRun: boolean },
	confirm: (question: string) => Promise<boolean>,
): Promise<string> => {
	const inside = await gitLines(cwd, ["rev-parse", "--is-inside-work-tree"]);
	if (inside[0] !== "true") {
		return "Skipped the ignore files: this folder is not a git repo.";
	}
	const edits = ignoreEdits(await readListing(cwd), {
		gitignore: await readOr(join(cwd, ".gitignore")),
		ignore: await readOr(join(cwd, ".ignore")),
	});
	if (edits.length === 0) {
		return "The ignore files are up to date.";
	}
	const shown = previewEdits(edits);
	if (options.dryRun) {
		return `Would change:\n${shown}`;
	}
	console.info(shown);
	if (!(await confirm("Write the ignore file block?"))) {
		return "Wrote no ignore file.";
	}
	return (await Promise.all(edits.map((edit) => writeEdit(cwd, edit)))).join(
		"\n",
	);
};
