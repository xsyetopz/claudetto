// The undo of the `protect` slice: writes back a protected file that a `Bash` call changed, and deletes one that it created.

import { hash64 } from "../../../project/domain/ledger.ts";
import {
	changed,
	type Kind,
	kindOf,
	relative,
	type Saved,
} from "../domain/protect.ts";
import { RM_TIMEOUT_MS } from "../limits.ts";
import { movedTo, protectedFiles, textOf } from "./files.ts";
import type { Io } from "./io.ts";
import { fromGit, goneWithHead, type Look } from "./trust.ts";

/** Runs `run` for each of `items` one after the other, and gives the results in order. The runs have effects that depend on their order. */
const inOrder = async <T, R>(
	items: readonly T[],
	run: (item: T) => Promise<R>,
): Promise<R[]> => {
	const [item, ...rest] = items;
	if (item === undefined) {
		return [];
	}
	const first = await run(item);
	return [first, ...(await inOrder(rest, run))];
};

/** The kind of the protected file at the project path `path`. */
const kindAt = (look: Look, path: string): Kind | undefined => {
	const rel = relative(look.root, path);
	return rel === undefined ? undefined : kindOf(rel);
};

/** True when a line of `edit` of the ledger holds `path` with the hash of `text`: an `Edit` or `Write` made the file, and not the `Bash` call. */
const proven = (look: Look, path: string, text: string): boolean => {
	const hash = hash64(text);
	return look.ledger.some(
		(l) => l.via === "edit" && l.path === path && l.hash === hash,
	);
};

/** Writes back one saved file if the call changed it, and gives its path from the root, or `undefined` when it stays. */
const restoreOne = async (
	io: Io,
	look: Look,
	[path, { real, text }]: [string, { real: string; text: string }],
): Promise<string | undefined> => {
	const rel = relative(look.root, path);
	const kind = kindAt(look, path);
	if (rel === undefined || kind === undefined) {
		return undefined;
	}
	const gone = !(await io.exists(path).catch(() => true));
	// A file that `git checkout`, `git switch`, or `git pull` removed stays removed, as a file that they brought stays.
	if (gone && (await goneWithHead(io, look, rel))) {
		return undefined;
	}
	// A deleted file is written back also when the field does not list it.
	if (!gone && look.reported && !look.reported.includes(real)) {
		return undefined;
	}
	// A file that moved with its text unchanged, as `openspec archive` or `mv` does, broke no hook.
	if (gone && (await movedTo(io, look.root, rel, text))) {
		return undefined;
	}
	const now = await textOf(io, path);
	if (!gone && !changed(kind, text, now)) {
		return undefined;
	}
	if (now !== undefined && proven(look, path, now)) {
		return undefined;
	}
	// A commit that the call made is not trusted: `git commit` and a commit date are in the reach of the call.
	if (now !== undefined && (await fromGit(io, look, rel))) {
		return undefined;
	}
	await io.write(path, text);
	return rel;
};

/** Writes back each saved file that the call changed, and gives the paths from the root. */
export const restore = async (
	io: Io,
	look: Look,
	saved: Saved,
): Promise<string[]> =>
	(
		await inOrder(Object.entries(saved), (entry) => restoreOne(io, look, entry))
	).flatMap((rel) => (rel === undefined ? [] : [rel]));

/** Deletes one protected file that the call created, and gives its path from the root, or `undefined` when it stays or is no creation. A file that stays goes into `kept`. */
const removeOne = async (
	io: Io,
	look: Look,
	saved: Saved,
	kept: string[],
	rel: string,
): Promise<string | undefined> => {
	const path = `${look.root}/${rel}`;
	const kind = kindAt(look, path);
	if (kind === undefined || path in saved) {
		return undefined;
	}
	const text = await textOf(io, path);
	if (text === undefined || !changed(kind, undefined, text)) {
		return undefined;
	}
	if (proven(look, path, text)) {
		return undefined;
	}
	// A file that `git pull`, `git checkout`, or `git merge` brought stays, as `restore` leaves a changed file.
	if (await fromGit(io, look, rel)) {
		return undefined;
	}
	// `$.fs` has no delete: a run that rejects or exits with a code is not an undo, and the other files still get their notes.
	const run = await io
		.run(["/bin/rm", "-f", "--", path], { timeoutMs: RM_TIMEOUT_MS })
		.catch(() => undefined);
	if (run?.exitCode === 0) {
		return rel;
	}
	kept.push(rel);
	return undefined;
};

/** Deletes each protected file that the call created, from the field or by a new search with no field, and gives the paths from the root. A file that stays goes into `kept`. */
export const remove = async (
	io: Io,
	look: Look,
	saved: Saved,
	kept: string[],
): Promise<string[]> => {
	const now = look.reported
		? look.reported.flatMap((p) => {
				const rel = relative(look.realRoot, p) ?? relative(look.root, p);
				return rel === undefined ? [] : [rel];
			})
		: await protectedFiles(io, look.root);
	return (
		await inOrder(now, (rel) => removeOne(io, look, saved, kept, rel))
	).flatMap((rel) => (rel === undefined ? [] : [rel]));
};
