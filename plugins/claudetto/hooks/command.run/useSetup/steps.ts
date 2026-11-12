import type { EngineInterface } from "claude-code";

import { ask, lines, textOf } from "./engine";
import { type IgnoreEdit, ignoreEdits, previewEdits, settle } from "./ignores";
import { linesOf, planStarter, previewOf, type StarterFile } from "./starter";
import {
	isOnPath,
	listedPaths,
	MOLE,
	noticeKey,
	PURGE_PATHS,
	type Tool,
} from "./tools";

const WRITE = "Write";
const SKIP = "Skip";
const YES = "Yes";
const NO = "No";
const INSTALL_MS = 600_000;

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

async function cwdOf($: EngineInterface): Promise<string | undefined> {
	try {
		return await $.session.cwd();
	} catch (error) {
		$.ui.log(`The working directory was not read (${String(error)})`);
		return undefined;
	}
}

const dismissed = (what: string): string =>
	`Wrote no ${what}: the question was dismissed, or this session has no one to answer.`;

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

/** The starter files for a repo with no memory file, shown in a dialog and written only on a yes. */
export async function starterPart(
	$: EngineInterface,
): Promise<string | undefined> {
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
	let answer: string;
	try {
		answer = await ask(
			$,
			`${previewOf(files)}\nWrite these files? A file that exists is never replaced.`,
			[WRITE, SKIP],
		);
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

/** The marked block of `.gitignore` and `.ignore`, shown as a diff in a dialog and written only on a yes. */
export async function ignoresPart(
	$: EngineInterface,
): Promise<string | undefined> {
	const cwd = await cwdOf($);
	if (cwd === undefined) {
		return undefined;
	}
	const [inside] = await git($, ["rev-parse", "--is-inside-work-tree"]);
	if (inside !== "true") {
		return undefined;
	}
	const edits = ignoreEdits(await repoFiles($), {
		gitignore: await textOf($, `${cwd}/.gitignore`),
		ignore: await textOf($, `${cwd}/.ignore`),
	});
	if (edits.length === 0) {
		return undefined;
	}
	let answer: string;
	try {
		answer = await ask(
			$,
			`${previewEdits(edits)}\nWrite the ignore file block? Lines outside the marked block are never changed. The block narrows \`Grep\` (a call with no \`glob\`) and not \`Glob\`, which still lists ignored files.`,
			[WRITE, SKIP],
		);
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

/** A missing tool: its install command shown and run after a yes. A declined optional tool is recorded, so the launch notice stays quiet. */
export async function toolPart(
	$: EngineInterface,
	tool: Tool,
): Promise<string | undefined> {
	const exists = (file: string) => $.fs.exists(file);
	const path = await $.env.get("PATH");
	if (await isOnPath(tool.name, path, exists)) {
		return undefined;
	}
	if (!(await isOnPath("brew", path, exists))) {
		return `\`${tool.name}\` has no package manager here, so nothing was run. Releases are at ${tool.releases}.`;
	}
	const shown = tool.install.join(" ");
	let answer: string;
	try {
		answer = await ask(
			$,
			`\`${tool.name}\` is not installed. Run \`${shown}\`?`,
			[YES, NO],
		);
	} catch (error) {
		$.ui.log(`The install question was not answered (${String(error)})`);
		return dismissed("install");
	}
	if (answer.trim() !== YES) {
		if (tool.required) {
			return `Did not install \`${tool.name}\`: ${tool.why}. Run \`${shown}\` to fix it.`;
		}
		await $.store.set(noticeKey(tool), true);
		return `Did not install \`${tool.name}\`. The launch notice stays quiet.`;
	}
	try {
		const result = await $.process.run(tool.install, { timeoutMs: INSTALL_MS });
		return result.exitCode === 0
			? `Ran \`${shown}\`.`
			: `\`${shown}\` failed with exit code ${result.exitCode}: ${result.stderr.trim()}`;
	} catch (error) {
		return `Could not run \`${shown}\` (${String(error)}).`;
	}
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
