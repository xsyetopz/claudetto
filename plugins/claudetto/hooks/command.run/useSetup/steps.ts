import type { EngineInterface } from "claude-code";

import {
	type Advice,
	ask,
	dismissed,
	lines,
	type Question,
	textOf,
} from "./engine";
import {
	dependencyFolders,
	type IgnoreEdit,
	ignoreEdits,
	previewEdits,
	settle,
} from "./ignore";
import { linesOf, planStarter, previewOf, type StarterFile } from "./starter";
import { isOnPath, listedPaths, MOLE, PURGE_PATHS } from "./tools";

const WRITE = "Write";
const SKIP = "Skip";

const FILES_ARGS = ["ls-files", "--cached", "--others", "--exclude-standard"];

/** The non-blank lines `git` prints for `args` in the folder, or none when `git` fails. */
async function git(
	$: EngineInterface,
	args: readonly string[],
): Promise<string[]> {
	return linesOf(await lines($, ["git", "-C", await $.session.cwd(), ...args]));
}

async function repoFiles($: EngineInterface) {
	return {
		files: await git($, FILES_ARGS),
		tracked: await git($, ["ls-files"]),
	};
}

/** The dependency folders at the project root that git ignores and a worktree can link. */
export async function linkedFolders($: EngineInterface): Promise<string[]> {
	return dependencyFolders(
		await git($, [
			"ls-files",
			"--others",
			"--ignored",
			"--exclude-standard",
			"--directory",
		]),
	);
}

async function cwdOf($: EngineInterface): Promise<string | undefined> {
	try {
		return await $.session.cwd();
	} catch (error) {
		$.ui.log(`The working directory was not read (${String(error)})`);
		return undefined;
	}
}

async function writeNew(
	$: EngineInterface,
	cwd: string,
	file: StarterFile,
): Promise<string> {
	const path = `${cwd}/${file.path}`;
	try {
		if (await $.fs.exists(path)) {
			return `\`${path}\` exists, so it was left as it is.`;
		}
		await $.fs.write(path, file.text);
		return `Wrote \`${path}\`.`;
	} catch (error) {
		return `Could not write \`${path}\` (${String(error)}).`;
	}
}

/** The starter files offer for a repo with no memory file. */
export async function starterOffer(
	$: EngineInterface,
): Promise<
	{ question: Question; cwd: string; files: readonly StarterFile[] } | undefined
> {
	const cwd = await cwdOf($);
	if (cwd === undefined) {
		return undefined;
	}
	const files = planStarter(await repoFiles($), {
		agents: await $.fs.exists(`${cwd}/AGENTS.md`),
		claude: await $.fs.exists(`${cwd}/CLAUDE.md`),
	});
	if (files.length === 0) {
		return undefined;
	}
	return {
		question: {
			text: `${previewOf(files)}\nWrite these files? A file that exists is never replaced.`,
			options: [WRITE, SKIP],
		},
		cwd,
		files,
	};
}

/** The starter files for a repo with no memory file, shown in a dialog and written only on a yes. */
export async function starterPart(
	$: EngineInterface,
	advice: Advice,
): Promise<string | undefined> {
	const offer = await starterOffer($);
	if (offer === undefined) {
		return undefined;
	}
	const { question, cwd, files } = offer;
	let answer: string;
	try {
		answer = await ask($, question, advice);
	} catch (error) {
		$.ui.log(`The starter file question was not answered (${String(error)})`);
		return dismissed("starter file");
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no starter file.";
	}
	const written = await Promise.all(
		files.map((file) => writeNew($, cwd, file)),
	);
	return written.join("\n");
}

async function writeEdit(
	$: EngineInterface,
	cwd: string,
	edit: IgnoreEdit,
): Promise<string> {
	const path = `${cwd}/${edit.path}`;
	try {
		const text = settle(edit, await textOf($, path));
		if (text === undefined) {
			return `\`${path}\` needs no change.`;
		}
		await $.fs.write(path, text);
		return `Wrote \`${path}\`.`;
	} catch (error) {
		return `Could not write \`${path}\` (${String(error)}).`;
	}
}

/** The offer of the marked block of `.gitignore` and `.ignore`, for a git repo whose block differs. */
export async function ignoresOffer(
	$: EngineInterface,
): Promise<
	{ question: Question; cwd: string; edits: readonly IgnoreEdit[] } | undefined
> {
	const cwd = await cwdOf($);
	if (cwd === undefined) {
		return undefined;
	}
	const [inside] = await git($, ["rev-parse", "--is-inside-work-tree"]);
	if (inside !== "true") {
		return undefined;
	}
	const edits = ignoreEdits(
		await repoFiles($),
		{
			gitignore: await textOf($, `${cwd}/.gitignore`),
			ignore: await textOf($, `${cwd}/.ignore`),
		},
		await linkedFolders($),
	);
	if (edits.length === 0) {
		return undefined;
	}
	return {
		question: {
			text: `${previewEdits(edits)}\nWrite the ignore file block? Lines outside the marked block are never changed. The block narrows \`Grep\` (a call with no \`glob\`) and not \`Glob\`, which still lists ignored files.`,
			options: [WRITE, SKIP],
		},
		cwd,
		edits,
	};
}

/** The marked block of `.gitignore` and `.ignore`, shown as a diff in a dialog and written only on a yes. */
export async function ignoresPart(
	$: EngineInterface,
	advice: Advice,
): Promise<string | undefined> {
	const offer = await ignoresOffer($);
	if (offer === undefined) {
		return undefined;
	}
	const { question, cwd, edits } = offer;
	let answer: string;
	try {
		answer = await ask($, question, advice);
	} catch (error) {
		$.ui.log(`The ignore file question was not answered (${String(error)})`);
		return dismissed("ignore file");
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no ignore file.";
	}
	const written = await Promise.all(
		edits.map((edit) => writeEdit($, cwd, edit)),
	);
	return written.join("\n");
}

/** Adds the project root to Mole's `purge_paths`, unless it or a folder holding it is listed already. */
export async function purgePart(
	$: EngineInterface,
): Promise<string | undefined> {
	const onPath = await isOnPath(MOLE.name, await $.env.get("PATH"), (file) =>
		$.fs.exists(file),
	);
	if (!onPath) {
		return undefined;
	}
	const home = (await $.env.get("HOME")) ?? "";
	const file = `${home}/${PURGE_PATHS}`;
	const awaited = await git($, ["rev-parse", "--show-toplevel"]);
	const root = awaited[0] ?? (await $.session.cwd());
	const text = (await $.fs.exists(file)) ? await $.fs.read(file) : "";
	if (
		listedPaths(text, home).some(
			(dir) => root === dir || root.startsWith(`${dir}/`),
		)
	) {
		return undefined;
	}
	const gap = text === "" || text.endsWith("\n") ? "" : "\n";
	await $.fs.write(file, `${text}${gap}${root}\n`);
	return `Added ${root} to ${file}, so \`mo purge\` scans it.`;
}
