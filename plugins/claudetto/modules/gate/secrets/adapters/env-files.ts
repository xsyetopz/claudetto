// The list of the env files of a project and their entries, read again only when the modification time changes.

import { ENV_FILE } from "../../domain/paths.ts";
import { ENV_FILE_CHARS, ENV_FILES_MAX } from "../../limits.ts";
import { type Entry, parseEnv } from "../domain/env.ts";
import { WHY_FILES, WHY_SCAN } from "../prompts.ts";

/** A process run in the project, which gives `undefined` when it fails to start. */
export type Run = (
	argv: string[],
) => Promise<
	{ exitCode: number; stdout: string; isStdoutTruncated: boolean } | undefined
>;

/** The reads of one file: its `stat` and its text, each `undefined` when the call fails. */
export interface Files {
	stat: (
		path: string,
	) => Promise<{ kind: string; size: number; mtimeMs: number } | undefined>;
	read: (path: string) => Promise<unknown>;
}

/** The entries of each env file by path, with the modification time of the read. The mod may load again in the same session, and then the files are read once more. A file that is gone leaves the hold. */
export const held = new Map<
	string,
	{ mtimeMs: number; entries: Entry[]; isLong: boolean }
>();

/** The lines of the output of a listing that name an env file. */
const named = (root: string, stdout: string): string[] =>
	stdout
		.split("\n")
		.filter((l) => l !== "" && ENV_FILE.test(l.slice(l.lastIndexOf("/") + 1)))
		.map((l) => (l.startsWith("/") ? l : `${root}/${l}`));

/** The env files under `root` at any depth, without `node_modules` and `.git`, and the reason when a bound cut the list. */
export const scan = async (
	run: Run,
	root: string,
): Promise<{ files: string[]; why: string | undefined }> => {
	let out = await run([
		...["rg", "--files", "--hidden", "--no-ignore"],
		...["-g", ".env*", "-g", "*.env", "-g", "!node_modules", "-g", "!.git"],
		root,
	]);
	if (out === undefined || out.exitCode > 1) {
		out = await run([
			...["find", root, "(", "-name", "node_modules", "-o", "-name", ".git"],
			...[")", "-prune", "-o", "-type", "f", "(", "-name", ".env*"],
			...["-o", "-name", "*.env", ")", "-print"],
		]);
	}
	if (out === undefined || out.exitCode > 1) {
		return { files: [], why: WHY_SCAN };
	}
	const files = named(root, out.stdout).sort(
		(a, b) => a.split("/").length - b.split("/").length,
	);
	const why =
		out.isStdoutTruncated || files.length > ENV_FILES_MAX
			? WHY_FILES({ max: ENV_FILES_MAX })
			: undefined;
	return { files: files.slice(0, ENV_FILES_MAX), why };
};

/** The entries of the env file `path`, from the hold when its modification time is the same, and whether the file is too long to read. */
export const entriesOf = async (
	files: Files,
	path: string,
): Promise<{ entries: Entry[]; isLong: boolean }> => {
	const stat = await files.stat(path);
	if (stat === undefined || stat.kind !== "file") {
		held.delete(path);
		return { entries: [], isLong: false };
	}
	if (stat.size > ENV_FILE_CHARS) {
		return { entries: [], isLong: true };
	}
	const kept = held.get(path);
	if (kept?.mtimeMs === stat.mtimeMs) {
		return kept;
	}
	const text = await files.read(path);
	if (typeof text !== "string") {
		// A failed read is not a file with no values: the path leaves the hold, so it is not readable and its remembered values stay.
		held.delete(path);
		return { entries: [], isLong: false };
	}
	const isLong = text.length > ENV_FILE_CHARS;
	const entries = isLong ? [] : parseEnv(text);
	const read = { mtimeMs: stat.mtimeMs, entries, isLong };
	held.set(path, read);
	return read;
};
