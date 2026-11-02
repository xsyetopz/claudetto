import {
	planStarter,
	previewOf,
	type StarterFile,
} from "../../../tiers/starter/plan.ts";
import { type StarterIo, WRITE } from "./io.ts";

const writeNew = async (
	io: StarterIo,
	cwd: string,
	file: StarterFile,
): Promise<string> => {
	const path = `${cwd}/${file.path}`;
	try {
		if (await io.exists(path)) {
			return `\`${path}\` exists, so it was left as it is.`;
		}
		await io.write(path, file.text);
		return `Wrote \`${path}\`.`;
	} catch (error) {
		return `Could not write \`${path}\` (${String(error)}).`;
	}
};

/** The starter files for a repo with no memory file, shown in a dialog and written only on a yes. */
export const starterPart = async (
	io: StarterIo,
): Promise<string | undefined> => {
	let cwd: string;
	try {
		cwd = await io.cwd();
	} catch {
		return undefined;
	}
	const files = planStarter(
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
			agents: await io.exists(`${cwd}/AGENTS.md`),
			claude: await io.exists(`${cwd}/CLAUDE.md`),
		},
	);
	if (files.length === 0) {
		return undefined;
	}
	let answer: string;
	try {
		answer = await io.ask(
			`${previewOf(files)}\nWrite these files? A file that exists is never replaced.`,
			"Starter",
		);
	} catch {
		return "Wrote no starter file: the question was dismissed, or this session has no one to answer.";
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no starter file.";
	}
	const lines = await Promise.all(files.map((file) => writeNew(io, cwd, file)));
	return lines.join("\n");
};
