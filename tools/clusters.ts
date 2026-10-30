// A file is not a directory. A cluster of sibling files that share a name token belongs in a folder
// named for that token, with the token dropped from each member: `bash-findings.ts` and its nine
// siblings are `gate/findings/bash.ts` and nine siblings, and the module that names the folder keeps
// the folder's own name, as `gate/gate.ts` does. This check holds that convention so that it rests on
// a command rather than on a reviewer noticing. It reads names only and never opens a file, because
// the convention is about names.
//
// Five shapes count as a cluster, and each is a different way the same mistake appears. Four read the
// file names of a folder against each other. The fifth reads a file name against the folder names
// beside it, because once the folder exists a single new file is enough to start the mistake again and
// the other four need two files to see anything.
//
//   bun tools/clusters.ts

import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * The roots to walk. `archive/` is left out, because it is the tree this change replaces. `docs` is in
 * because a page is a file like any other and `docs/` was built almost entirely of the head shape that
 * `headFaults` refuses; `openspec/` is out, because a change folder's names are the minispec's layout
 * and not ours to pick.
 */
export const ROOTS: readonly string[] = [
	"plugins",
	"tools",
	"claudekit",
	"tests",
	"docs",
];

/** Folders that hold no source of ours, so a name inside one says nothing about the convention. */
const SKIP = new Set(["node_modules", ".git"]);

/**
 * Folders whose shape is the point, so this check must not ask them to move. A page under `docs/keep/`
 * is named for the one surface it decides, so a run of sibling names there is the layout the folder
 * wants rather than a cluster to fix. The exemption is a path and not a folder name, so a folder called
 * `keep` elsewhere is still governed.
 */
const EXEMPT: readonly string[] = ["docs/keep"];

/**
 * A file the convention governs: a `.ts` module, or a `.md` page, which `docs/` is built of. A `.d.ts`
 * is vendored rather than written here. Markdown is read in every root and not in `docs/` alone, which
 * costs nothing: the other roots hold four `.md` files in all, the three agents and the output style of
 * `plugins/claudetto/`, and no stem of the four carries a `-`, so one rule covers the whole tree.
 */
const SOURCE = /\.(?:ts|md)$/;
const DECLARATION = /\.d\.ts$/;

/**
 * Either test marker, which is not part of the name being compared: `plan.spec.ts` and
 * `plan-cost.spec.ts` are the same cluster as `plan.ts` and `plan-cost.ts`. Both markers are stripped
 * and not only `.spec`, because `tests/` is a root of the walk and every file under it is `.test.ts`.
 */
const MARKER = /\.(?:spec|test)$/;

/** The stem of a file name: the name without its extension, and without a test marker before it. */
export const stemOf = (name: string): string =>
	name.replace(DECLARATION, "").replace(SOURCE, "").replace(MARKER, "");

/**
 * A segment of only digits and dots, as `2.1.301` or `2`. It names a release or an ordinal, and
 * neither is a concern: `probes-2.1.301.md` carries a Claude Code version and not a subject, and the
 * `part-2.md` pages under `docs/dossier/` carry a count and not a subject.
 */
const NUMERIC = /^[\d.]+$/;

/** The last `-` segment of a stem, or `null` when the stem has no `-` or the segment is numeric. */
const tailOf = (stem: string): string | null => {
	const at = stem.lastIndexOf("-");
	const tail = at === -1 ? null : stem.slice(at + 1);
	return tail === null || NUMERIC.test(tail) ? null : tail;
};

/** The first `-` segment of a stem, or `null` when the stem has no `-` or the segment is numeric. */
const headOf = (stem: string): string | null => {
	const at = stem.indexOf("-");
	const head = at === -1 ? null : stem.slice(0, at);
	return head === null || NUMERIC.test(head) ? null : head;
};

/**
 * One `.ts` file of a folder. The stem is what the convention compares and the file name is what a
 * message gives, because a message built from the stem of `plan.spec.ts` would name `plan.ts`, which
 * is not on disk and which a reader cannot open.
 */
export interface Member {
	readonly stem: string;
	readonly file: string;
}

/**
 * A folder, the `.ts` files directly inside it, and the names of the folders directly inside it. The
 * folder is the one a reader sees as the concern, so for a `__tests__/` the folder above it is used: a
 * test is named after what it covers, and the concern it belongs to is the one holding the sources.
 * The child folder names are carried because `folderFaults` reads a file name against them.
 */
export interface Folder {
	readonly dir: string;
	readonly concern: string;
	readonly members: readonly Member[];
	readonly folders: readonly string[];
}

/** The name of the folder a file belongs to, climbing out of a `__tests__/`. */
export const concernOf = (dir: string): string => {
	const parts = dir.split("/");
	const last = parts.at(-1) ?? "";
	return last === "__tests__" ? (parts.at(-2) ?? "") : last;
};

/**
 * Two siblings where one stem is the other plus `-` and more, as `spawn.ts` beside `spawn-hook.ts`.
 * The shorter name is already the concern, so the longer one is a member of a folder that was never
 * made.
 */
export const prefixFaults = (folder: Folder): string[] => {
	const lines: string[] = [];
	for (const one of folder.members) {
		for (const other of folder.members) {
			if (other.stem !== one.stem && other.stem.startsWith(`${one.stem}-`)) {
				lines.push(
					`${folder.dir}/: ${other.file} sits beside ${one.file}, so ${one.stem} is a concern with members and belongs as a folder named ${one.stem}/ holding ${other.file.slice(one.stem.length + 1)}`,
				);
			}
		}
	}
	return lines;
};

/**
 * Two or more siblings ending in the same `-` segment, as `spawn-hook.ts` beside `stop-hook.ts`. The
 * shared tail is the concern even though no file carries it alone, which is the case `survey.md`
 * calls a suffix cluster and resolved as `gate/findings/`.
 */
export const suffixFaults = (folder: Folder): string[] => {
	const byTail = new Map<string, string[]>();
	for (const member of folder.members) {
		const tail = tailOf(member.stem);
		if (tail !== null) {
			byTail.set(tail, [...(byTail.get(tail) ?? []), member.file]);
		}
	}
	return [...byTail]
		.filter(([, files]) => files.length > 1)
		.map(
			([tail, files]) =>
				`${folder.dir}/: ${files.join(", ")} share the tail -${tail}, so ${tail} is a concern and belongs as a folder named ${tail}/ with the tail dropped from each name`,
		);
};

/**
 * Whether every member of a head cluster differs from the others by a number alone, as `part-2.md`
 * beside `part-3.md`. The head is then the whole name and the difference is an ordinal, so the members
 * are parts of one subject rather than members of a concern, and a folder named for the head would hold
 * `2.md` and `3.md` and say nothing. `docs/dossier/exports/` is the real case: `part-2.md` and
 * `part-3.md` continue the `exports.md` beside them.
 */
const ordinals = (head: string, members: readonly Member[]): boolean =>
	members.every((m) => NUMERIC.test(m.stem.slice(head.length + 1)));

/**
 * Two or more siblings starting with the same `-` segment where no sibling carries that segment alone,
 * as `evidence-foo.md` beside `evidence-bar.md` with no `evidence.md`. It is the mirror of
 * `suffixFaults`. When a sibling does carry the segment alone, `prefixFaults` already names the
 * concern with better evidence, so this stays quiet rather than report the same files twice. The same
 * holds when a sibling folder already carries the segment: `dirFaults` then names the folder the files
 * belong in, which is a shorter instruction than asking for a folder that is already there.
 */
export const headFaults = (folder: Folder): string[] => {
	const byHead = new Map<string, Member[]>();
	for (const member of folder.members) {
		const head = headOf(member.stem);
		if (head !== null) {
			byHead.set(head, [...(byHead.get(head) ?? []), member]);
		}
	}
	return [...byHead]
		.filter(
			([head, members]) =>
				members.length > 1 &&
				!folder.members.some((m) => m.stem === head) &&
				!folder.folders.includes(head) &&
				!ordinals(head, members),
		)
		.map(
			([head, members]) =>
				`${folder.dir}/: ${members.map((m) => m.file).join(", ")} share the head ${head}-, so ${head} is a concern and belongs as a folder named ${head}/ with the head dropped from each name`,
		);
};

/**
 * A file whose head segment is the name of a folder sitting beside it, as `evidence-new.md` beside
 * `evidence/`. This is the one shape a single file can make, and it is the one that brings the mistake
 * back after a move: the folder is already there, so the next page written at the old depth looks like
 * every page the move just cleared, and the other four rules see one file and say nothing. The name
 * already says where the file goes, so the message names the folder rather than asking for a new one.
 */
export const dirFaults = (folder: Folder): string[] =>
	folder.members
		.flatMap((member) => {
			const head = headOf(member.stem);
			return head !== null && folder.folders.includes(head)
				? [{ member, head }]
				: [];
		})
		.map(
			({ member, head }) =>
				`${folder.dir}/${member.file} names the folder ${folder.dir}/${head}/ beside it, so it belongs inside it as ${folder.dir}/${head}/${member.file.slice(head.length + 1)}`,
		);

/**
 * A file whose stem starts with its own folder's name and a `-`, as `evals-cli.ts` inside `evals/`.
 * The folder already says the word, so the prefix is read twice and says nothing the path did not.
 */
export const repeatFaults = (folder: Folder): string[] =>
	folder.members
		.filter((member) => member.stem.startsWith(`${folder.concern}-`))
		.map(
			(member) =>
				`${folder.dir}/${member.file} repeats its folder ${folder.concern}/ in its name, so the name is ${member.file.slice(folder.concern.length + 1)}`,
		);

/** One line per fault of one folder, in the order the five shapes are defined above. */
export const folderFaults = (folder: Folder): string[] => [
	...prefixFaults(folder),
	...suffixFaults(folder),
	...headFaults(folder),
	...dirFaults(folder),
	...repeatFaults(folder),
];

/** Every folder under `root` that holds at least one file of ours, with its members. */
export const readFolders = async (root: string): Promise<Folder[]> => {
	const found: Folder[] = [];
	const walk = async (dir: string): Promise<void> => {
		if (EXEMPT.includes(dir)) {
			return;
		}
		// A root that is absent is skipped rather than thrown, so the walk can be pointed at a tree
		// holding one of the roots, which is what a test plants.
		const entries = await readdir(join(root, dir), {
			withFileTypes: true,
		}).catch(() => []);
		const members = entries
			.filter(
				(e) => e.isFile() && SOURCE.test(e.name) && !DECLARATION.test(e.name),
			)
			.map((e) => ({ stem: stemOf(e.name), file: e.name }))
			.sort((a, b) => a.stem.localeCompare(b.stem));
		const children = entries.filter(
			(e) => e.isDirectory() && !SKIP.has(e.name),
		);
		// An exempt child still counts as a folder beside its siblings. The exemption is about the names
		// inside that folder and not about whether the folder exists, and a page named for it still
		// belongs in it.
		const folders = children.map((e) => e.name).sort();
		if (members.length > 0) {
			found.push({ dir, concern: concernOf(dir), members, folders });
		}
		await Promise.all(children.map((e) => walk(`${dir}/${e.name}`)));
	};
	await Promise.all(ROOTS.map(walk));
	return found.sort((a, b) => a.dir.localeCompare(b.dir));
};

if (import.meta.main) {
	const folders = await readFolders(join(import.meta.dir, ".."));
	const lines = folders.flatMap(folderFaults);
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
