// The protected files of a project: the root, the plan and spec files that exist, and the text and real path of a file.

import { kindOf } from "../domain/protect.ts";
import {
	ARCHIVE_DIR,
	PLAN_DIR,
	PLAN_SKIPPED,
	PROTECT_CHARS_MAX,
	PROTECT_DEPTH_MAX,
	PROTECT_DIRS_MAX,
	PROTECT_FILES_MAX,
	PROTECTED_FILES,
} from "../limits.ts";
import type { Io } from "./io.ts";

/** The folders of `dir` below the depth bound, and its plan and spec files, as paths from the root. */
const listPlan = async (
	io: Io,
	root: string,
	dir: string,
	depth: number,
	skipped: readonly string[],
): Promise<{ dirs: [string, number][]; files: string[] }> => {
	const dirs: [string, number][] = [];
	const files: string[] = [];
	for (const { name, kind } of await io
		.list(`${root}/${dir}`)
		.catch(() => [])) {
		const rel = `${dir}/${name}`;
		if (
			kind === "dir" &&
			depth < PROTECT_DEPTH_MAX &&
			!skipped.includes(name)
		) {
			dirs.push([rel, depth + 1]);
		} else if (kind === "file" && kindOf(rel) !== undefined) {
			files.push(rel);
		}
	}
	return { dirs, files };
};

/** The plan and spec files below `PLAN_DIR`, as paths from the root: a search by breadth, bounded in folders and depth. */
const planFiles = async (
	io: Io,
	root: string,
	queue: [string, number][] = [[PLAN_DIR, 0]],
	seen = 0,
	found: string[] = [],
	skipped: readonly string[] = PLAN_SKIPPED,
): Promise<string[]> => {
	const [next, ...rest] = queue;
	if (next === undefined || seen >= PROTECT_DIRS_MAX) {
		return found;
	}
	const listed = await listPlan(io, root, next[0], next[1], skipped);
	found.push(...listed.files);
	return planFiles(
		io,
		root,
		[...rest, ...listed.dirs],
		seen + 1,
		found,
		skipped,
	);
};

/** The protected files that exist now, as paths from the root: the fixed files, and the plan and spec files. */
export const protectedFiles = async (
	io: Io,
	root: string,
): Promise<string[]> => {
	const exist = await Promise.all(
		PROTECTED_FILES.map((rel) =>
			io.exists(`${root}/${rel}`).catch(() => false),
		),
	);
	const found = PROTECTED_FILES.filter((_, i) => exist[i]);
	return [...found, ...(await planFiles(io, root))].slice(0, PROTECT_FILES_MAX);
};

/** The text of the file `path`, or `undefined` for a file that is missing, unreadable, or over `PROTECT_CHARS_MAX`. */
export const textOf = async (
	io: Io,
	path: string,
): Promise<string | undefined> => {
	const text = await io.read(path).catch(() => undefined);
	return typeof text === "string" && text.length <= PROTECT_CHARS_MAX
		? text
		: undefined;
};

export const realOf = async (io: Io, path: string): Promise<string> =>
	(await io.stat(path).catch(() => undefined))?.realPath ?? path;

const CHANGE_FILE = new RegExp(`^${PLAN_DIR}/changes/([^/]+)/(.+)$`);

/** True when the text `text` of the gone file `rel` (a path from the root) is the text of a file that exists now under `PLAN_DIR`, in the archive or anywhere else: the file moved, and no text changed. The folder `ARCHIVE_DIR/*-<name>` of `openspec archive` is read first, then the plan files of `PLAN_DIR` with the archive in the search. */
export const movedTo = async (
	io: Io,
	root: string,
	rel: string,
	text: string,
): Promise<boolean> => {
	const m = CHANGE_FILE.exec(rel);
	const archived = m?.[1] && m[2] ? { name: m[1], sub: m[2] } : undefined;
	if (archived !== undefined) {
		const dirs = (
			await io.list(`${root}/${ARCHIVE_DIR}`).catch(() => [])
		).filter((d) => d.kind === "dir" && d.name.endsWith(`-${archived.name}`));
		const copies = await Promise.all(
			dirs.map(({ name }) =>
				textOf(io, `${root}/${ARCHIVE_DIR}/${name}/${archived.sub}`),
			),
		);
		if (copies.includes(text)) {
			return true;
		}
	}
	const base = rel.slice(rel.lastIndexOf("/") + 1);
	const names = (
		await planFiles(io, root, [[PLAN_DIR, 0]], 0, [], ["node_modules"])
	).filter((f) => f.endsWith(`/${base}`) && f !== rel);
	const texts = await Promise.all(names.map((f) => textOf(io, `${root}/${f}`)));
	return texts.includes(text);
};
