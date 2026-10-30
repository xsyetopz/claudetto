// Marks the folder of an arm as trusted before the session starts, and takes the mark out again
// when the arm ends.
//
// A fresh folder puts the session on `Is this a project you created or one you trust?` with
// `No, exit` preselected, and nothing else happens until that is answered, so the arm measures
// nothing. Typing the answer into the pty does not work: `Down` moves onto `Yes, I trust this
// folder`, and the `Enter` after it moves the selection back onto `No, exit`. The answer the dialog
// would have written is one flag in `~/.claude.json`, so the arm writes it itself.

import { homedir } from "node:os";
import path from "node:path";
import { objectOf, parsedOf } from "./json.ts";
import { underLock } from "./lock.ts";

/** The file that holds the trust answer of every folder. */
export const configPath = (): string => path.join(homedir(), ".claude.json");

/**
 * The config with `dir` trusted. `dir` has to be the real path, because that is the key the session
 * looks up: a session started in `/tmp/x` reports its folder as `/private/tmp/x` on macOS.
 */
export const withTrust = (config: string, dir: string): string => {
	const parsed = parsedOf(config);
	const projects = objectOf(parsed["projects"]);
	return JSON.stringify({
		...parsed,
		projects: {
			...projects,
			[dir]: { ...objectOf(projects[dir]), hasTrustDialogAccepted: true },
		},
	});
};

/**
 * The config with every entry inside `dir` taken out, so the round leaves nothing behind. It takes
 * a folder of the round rather than one arm, because a round that is killed between its arms has no
 * chance to clean up the arm that was running.
 */
export const withoutTrust = (config: string, dir: string): string => {
	const parsed = parsedOf(config);
	const kept = Object.fromEntries(
		Object.entries(objectOf(parsed["projects"])).filter(
			([key]) => key !== dir && !key.startsWith(`${dir}/`),
		),
	);
	return JSON.stringify({ ...parsed, projects: kept });
};

// Under the lock, because a live session writes this file too and an unlocked read-modify-write of a
// 116 KB config drops whatever the other writer put there between the read and the write.
const change = (
	file: string,
	dir: string,
	edit: (config: string, dir: string) => string,
): Promise<void> => underLock(file, (before) => edit(before, dir));

/** Marks the folder `dir` as trusted in the config `file`, under the lock. */
export const trust = (file: string, dir: string): Promise<void> =>
	change(file, dir, withTrust);

/** Removes every trust entry inside `dir` from the config `file`, under the lock. */
export const untrust = (file: string, dir: string): Promise<void> =>
	change(file, dir, withoutTrust);
