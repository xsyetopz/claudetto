// Usage: bun tools/clusters.ts

import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** `archive/` and `openspec/` are not walked: their names are not ours to pick. */
export const ROOTS: readonly string[] = [
	"plugins",
	"tools",
	"claudekit",
	"tests",
	"docs",
];

const SKIP = new Set(["node_modules", ".git"]);

/** A page under `docs/keep/` is named for the surface it decides; the exemption is a path. */
const EXEMPT: readonly string[] = ["docs/keep"];

const SOURCE = /\.(?:ts|md)$/;
const DECLARATION = /\.d\.ts$/;

/** Both markers are stripped, since every file under `tests/` is `.test.ts`. */
const MARKER = /\.(?:spec|test)$/;

export const stemOf = (name: string): string =>
	name.replace(DECLARATION, "").replace(SOURCE, "").replace(MARKER, "");

/** A release or an ordinal such as `2.1.301` or `2` names no subject. */
const NUMERIC = /^[\d.]+$/;

const tailOf = (stem: string): string | null => {
	const at = stem.lastIndexOf("-");
	const tail = at === -1 ? null : stem.slice(at + 1);
	return tail === null || NUMERIC.test(tail) ? null : tail;
};

const headOf = (stem: string): string | null => {
	const at = stem.indexOf("-");
	const head = at === -1 ? null : stem.slice(0, at);
	return head === null || NUMERIC.test(head) ? null : head;
};

/** A message names the file, not the stem: `plan.ts` for `plan.spec.ts` is not on disk. */
export interface Member {
	readonly stem: string;
	readonly file: string;
}

/** A `__tests__/` counts under the folder above it, since a test is named for what it covers. */
export interface Folder {
	readonly dir: string;
	readonly concern: string;
	readonly members: readonly Member[];
	readonly folders: readonly string[];
}

export const concernOf = (dir: string): string => {
	const parts = dir.split("/");
	const last = parts.at(-1) ?? "";
	return last === "__tests__" ? (parts.at(-2) ?? "") : last;
};

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

/** A number-only difference makes the members parts of one subject, not a concern. */
const ordinals = (head: string, members: readonly Member[]): boolean =>
	members.every((m) => NUMERIC.test(m.stem.slice(head.length + 1)));

/** Quiet when a sibling carries the segment alone, because `prefixFaults` already names it. */
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

/** The one shape a single file can make; the folder exists already, so the mistake returns. */
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

export const repeatFaults = (folder: Folder): string[] =>
	folder.members
		.filter((member) => member.stem.startsWith(`${folder.concern}-`))
		.map(
			(member) =>
				`${folder.dir}/${member.file} repeats its folder ${folder.concern}/ in its name, so the name is ${member.file.slice(folder.concern.length + 1)}`,
		);

export const folderFaults = (folder: Folder): string[] => [
	...prefixFaults(folder),
	...suffixFaults(folder),
	...headFaults(folder),
	...dirFaults(folder),
	...repeatFaults(folder),
];

export const readFolders = async (root: string): Promise<Folder[]> => {
	const found: Folder[] = [];
	const walk = async (dir: string): Promise<void> => {
		if (EXEMPT.includes(dir)) {
			return;
		}
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
