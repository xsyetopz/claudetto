import {
	type IgnoreEdit,
	ignoreEdits,
	previewEdits,
	settle,
} from "../../../tiers/starter/ignore/files.ts";
import { type StarterIo, WRITE } from "./io.ts";

const writeEdit = async (
	io: StarterIo,
	cwd: string,
	edit: IgnoreEdit,
): Promise<string> => {
	const path = `${cwd}/${edit.path}`;
	try {
		const current = (await io.exists(path)) ? await io.read(path) : undefined;
		const text = settle(edit, current);
		if (text === undefined) {
			return `\`${path}\` needs no change.`;
		}
		await io.write(path, text);
		return `Wrote \`${path}\`.`;
	} catch (error) {
		return `Could not write \`${path}\` (${String(error)}).`;
	}
};

const textOf = async (
	io: StarterIo,
	path: string,
): Promise<string | undefined> => {
	try {
		return (await io.exists(path)) ? await io.read(path) : undefined;
	} catch {
		return undefined;
	}
};

/** The marked block of `.gitignore` and `.ignore`, shown as a diff in a dialog and written only on a yes. */
export const ignoresPart = async (
	io: StarterIo,
): Promise<string | undefined> => {
	let cwd: string;
	try {
		cwd = await io.cwd();
	} catch {
		return undefined;
	}
	if ((await io.git(["rev-parse", "--is-inside-work-tree"]))[0] !== "true") {
		return undefined;
	}
	const edits = ignoreEdits(
		{
			files: await io.git([
				"ls-files",
				"--cached",
				"--others",
				"--exclude-standard",
			]),
			tracked: await io.git(["ls-files"]),
		},
		{
			gitignore: await textOf(io, `${cwd}/.gitignore`),
			ignore: await textOf(io, `${cwd}/.ignore`),
		},
	);
	if (edits.length === 0) {
		return undefined;
	}
	let answer: string;
	try {
		answer = await io.ask(
			`${previewEdits(edits)}\nWrite the ignore file block? Lines outside the marked block are never changed.`,
			"Ignore files",
		);
	} catch {
		return "Wrote no ignore file: the question was dismissed, or this session has no one to answer.";
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no ignore file.";
	}
	return (
		await Promise.all(edits.map((edit) => writeEdit(io, cwd, edit)))
	).join("\n");
};
