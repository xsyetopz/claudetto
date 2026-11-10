// What the starter, ignore, and tool parts of the setup command need. A closure over `$` stands in for each, because the hook loader takes `$` into a helper only within the file that defines it.

import {
	type IgnoreEdit,
	ignoreEdits,
	previewEdits,
	settle,
} from "./ignores.ts";
import { planStarter, previewOf, type StarterFile } from "./starter.ts";
import {
	isOnPath,
	listedPaths,
	MOLE,
	noticeKey,
	PURGE_PATHS,
	type Tool,
} from "./tools.ts";

const WRITE = "Write";
const SKIP = "Skip";
const YES = "Yes";
const NO = "No";

export interface Io {
	cwd: () => Promise<string>;
	/** The non-blank lines `git` prints for `args` in the folder, or none when `git` fails. */
	git: (args: readonly string[]) => Promise<string[]>;
	exists: (path: string) => Promise<boolean>;
	read: (path: string) => Promise<string>;
	write: (path: string, text: string) => Promise<void>;
	/** The option picked; it throws when the question is dismissed. */
	ask: (
		question: string,
		header: string,
		options: readonly string[],
	) => Promise<string>;
	path: () => Promise<string | undefined>;
	home: () => Promise<string>;
	/** Records that the tool's install was declined, so the launch notice stays quiet. */
	decline: (key: string) => Promise<void>;
	run: (argv: readonly string[]) => Promise<{ exitCode: number; text: string }>;
}

const FILES_ARGS = ["ls-files", "--cached", "--others", "--exclude-standard"];

const repoFiles = async (io: Io) => ({
	files: await io.git(FILES_ARGS),
	tracked: await io.git(["ls-files"]),
});

const textOf = async (io: Io, path: string): Promise<string | undefined> => {
	try {
		return (await io.exists(path)) ? await io.read(path) : undefined;
	} catch {
		return undefined;
	}
};

const cwdOf = async (io: Io): Promise<string | undefined> => {
	try {
		return await io.cwd();
	} catch {
		return undefined;
	}
};

const dismissed = (what: string): string =>
	`Wrote no ${what}: the question was dismissed, or this session has no one to answer.`;

const writeNew = async (
	io: Io,
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
export const starterPart = async (io: Io): Promise<string | undefined> => {
	const cwd = await cwdOf(io);
	if (cwd === undefined) {
		return undefined;
	}
	const files = planStarter(await repoFiles(io), {
		agents: await io.exists(`${cwd}/AGENTS.md`),
		claude: await io.exists(`${cwd}/CLAUDE.md`),
	});
	if (files.length === 0) {
		return undefined;
	}
	let answer: string;
	try {
		answer = await io.ask(
			`${previewOf(files)}\nWrite these files? A file that exists is never replaced.`,
			"Starter",
			[WRITE, SKIP],
		);
	} catch {
		return dismissed("starter file");
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no starter file.";
	}
	const written = await Promise.all(
		files.map((file) => writeNew(io, cwd, file)),
	);
	return written.join("\n");
};

const writeEdit = async (
	io: Io,
	cwd: string,
	edit: IgnoreEdit,
): Promise<string> => {
	const path = `${cwd}/${edit.path}`;
	try {
		const text = settle(edit, await textOf(io, path));
		if (text === undefined) {
			return `\`${path}\` needs no change.`;
		}
		await io.write(path, text);
		return `Wrote \`${path}\`.`;
	} catch (error) {
		return `Could not write \`${path}\` (${String(error)}).`;
	}
};

/** The marked block of `.gitignore` and `.ignore`, shown as a diff in a dialog and written only on a yes. */
export const ignoresPart = async (io: Io): Promise<string | undefined> => {
	const cwd = await cwdOf(io);
	if (cwd === undefined) {
		return undefined;
	}
	const [inside] = await io.git(["rev-parse", "--is-inside-work-tree"]);
	if (inside !== "true") {
		return undefined;
	}
	const edits = ignoreEdits(await repoFiles(io), {
		gitignore: await textOf(io, `${cwd}/.gitignore`),
		ignore: await textOf(io, `${cwd}/.ignore`),
	});
	if (edits.length === 0) {
		return undefined;
	}
	let answer: string;
	try {
		answer = await io.ask(
			`${previewEdits(edits)}\nWrite the ignore file block? Lines outside the marked block are never changed. The block narrows \`Grep\` (a call with no \`glob\`) and not \`Glob\`, which still lists ignored files.`,
			"Ignore files",
			[WRITE, SKIP],
		);
	} catch {
		return dismissed("ignore file");
	}
	if (answer.trim() !== WRITE) {
		return "Wrote no ignore file.";
	}
	const written = await Promise.all(
		edits.map((edit) => writeEdit(io, cwd, edit)),
	);
	return written.join("\n");
};

/** A missing tool: its install command shown and run after a yes. */
export const toolPart = async (
	io: Io,
	tool: Tool,
): Promise<string | undefined> => {
	const path = await io.path();
	if (await isOnPath(tool.name, path, io.exists)) {
		return undefined;
	}
	if (!(await isOnPath("brew", path, io.exists))) {
		return `\`${tool.name}\` has no package manager here, so nothing was run. Releases are at ${tool.releases}.`;
	}
	const shown = tool.install.join(" ");
	let answer: string;
	try {
		answer = await io.ask(
			`\`${tool.name}\` is not installed. Run \`${shown}\`?`,
			"Install tool",
			[YES, NO],
		);
	} catch {
		return dismissed("install");
	}
	if (answer.trim() !== YES) {
		if (tool.required) {
			return `Did not install \`${tool.name}\`: ${tool.why}. Run \`${shown}\` to fix it.`;
		}
		await io.decline(noticeKey(tool));
		return `Did not install \`${tool.name}\`. The launch notice stays quiet.`;
	}
	try {
		const result = await io.run(tool.install);
		return result.exitCode === 0
			? `Ran \`${shown}\`.`
			: `\`${shown}\` failed with exit code ${result.exitCode}: ${result.text.trim()}`;
	} catch (error) {
		return `Could not run \`${shown}\` (${String(error)}).`;
	}
};

/** Adds the project root to Mole's `purge_paths`, unless it or a folder holding it is listed already. */
export const purgePart = async (io: Io): Promise<string | undefined> => {
	if (!(await isOnPath(MOLE.name, await io.path(), io.exists))) {
		return undefined;
	}
	const home = await io.home();
	const file = `${home}/${PURGE_PATHS}`;
	const awaited = await io.git(["rev-parse", "--show-toplevel"]);
	const root = awaited[0] ?? (await io.cwd());
	const text = (await io.exists(file)) ? await io.read(file) : "";
	if (
		listedPaths(text, home).some(
			(dir) => root === dir || root.startsWith(`${dir}/`),
		)
	) {
		return undefined;
	}
	const gap = text === "" || text.endsWith("\n") ? "" : "\n";
	await io.write(file, `${text}${gap}${root}\n`);
	return `Added ${root} to ${file}, so \`mo purge\` scans it.`;
};
