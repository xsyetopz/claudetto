// The git state of the working folder, cached for `GIT_CACHE_MS` in one file for each repository, in the folder `claudetto-git-<uid>` of `os.tmpdir()`.
// The status line runs every `REFRESH_SECONDS`, so the cache keeps `git` from running on each refresh.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isExpected } from "../../../kernel/errors.ts";
import { failureText } from "../../../kernel/node/hook-io.ts";
import { parseJson } from "../../../kernel/text.ts";
import { GIT_CACHE_MS, GIT_TIMEOUT_MS } from "../limits.ts";
import type { GitFault, GitState } from "../types.ts";

import type { Deps } from "./cli.ts";

const CONTROL_CHAR = /\p{Cc}/u;
const CONTROL_CHARS = /\p{Cc}/gu;
const AHEAD_BEHIND = /\+(\d+) -(\d+)/;

type GitPorts = Pick<Deps, "files" | "write" | "now" | "runner" | "env">;

/** `undefined` is a folder that is no repository. */
type GitView = GitState | GitFault | undefined;

/**
 * The cache folder of the status line, or `undefined` when it is not safe to use:
 * it is made with mode `0700`, and it must have this owner, no group or other mode bits, and no link.
 */
export const cacheFolder = async (
	root: string = os.tmpdir(),
	uid: number = os.userInfo().uid,
): Promise<string | undefined> => {
	const folder = path.join(root, `claudetto-git-${uid}`);
	try {
		await fs.mkdir(folder, { mode: 0o700 });
	} catch (err) {
		if (!isExpected(err, "EEXIST")) {
			return undefined;
		}
	}
	try {
		const stat = await fs.lstat(folder);
		if (!stat.isDirectory() || stat.uid !== uid || (stat.mode & 0o077) !== 0) {
			return undefined;
		}
	} catch {
		return undefined;
	}
	return folder;
};

/** The cache file of the repository at `dir` in `cacheFolder`. The file name holds a hash, so the repository path is not in the temp folder. */
export const cacheFile = async (
	dir: string,
	root: string = os.tmpdir(),
	uid: number = os.userInfo().uid,
): Promise<string | undefined> => {
	const folder = await cacheFolder(root, uid);
	if (folder === undefined) {
		return undefined;
	}
	const key = new globalThis.Bun.CryptoHasher("sha256")
		.update(dir)
		.digest("hex");
	return path.join(folder, `claudetto-git-${key.slice(0, 16)}.jsonl`);
};

const plain = (v: unknown): boolean =>
	typeof v === "string" && v !== "" && !CONTROL_CHAR.test(v);
const count = (v: unknown): boolean =>
	typeof v === "number" && Number.isSafeInteger(v) && v >= 0;

/** True for a view that `runGit` can give (`null` is a folder that is no repository), so a damaged or foreign cache file is no cache. */
const isView = (v: unknown): v is GitView | null => {
	if (v === null) {
		return true;
	}
	if (typeof v !== "object") {
		return false;
	}
	const field = (key: string): unknown => Reflect.get(v, key);
	return "error" in v
		? plain(field("error"))
		: plain(field("branch")) &&
				[field("dirty"), field("ahead"), field("behind")].every(count);
};

/** The view in the cache text `text` when it is fresh at `now`, wrapped, so an `undefined` view (no repository) differs from no cache. */
const freshView = (
	text: string,
	now: number,
): { view: GitView } | undefined => {
	const saved = parseJson(text);
	if (typeof saved !== "object" || saved === null) {
		return undefined;
	}
	const at = Reflect.get(saved, "at");
	const state = Reflect.get(saved, "state");
	if (typeof at !== "number" || !isView(state)) {
		return undefined;
	}
	const age = now - at;
	return age >= 0 && age < GIT_CACHE_MS
		? { view: state ?? undefined }
		: undefined;
};

/** The state in `git status --porcelain=v2 -b` output. A detached head shows its short object name. */
const parseStatus = (text: string): GitState | undefined => {
	let branch: string | undefined;
	let oid: string | undefined;
	let [dirty, ahead, behind] = [0, 0, 0];
	for (const line of text.split("\n")) {
		if (line.startsWith("# branch.head ")) {
			branch = line.slice(14);
		} else if (line.startsWith("# branch.oid ")) {
			oid = line.slice(13, 20);
		} else if (line.startsWith("# branch.ab ")) {
			const m = AHEAD_BEHIND.exec(line);
			if (m) {
				[ahead, behind] = [Number(m[1]), Number(m[2])];
			}
		} else if (line && !line.startsWith("#")) {
			dirty++;
		}
	}
	if (branch === "(detached)") {
		branch = oid;
	}
	return branch ? { branch, dirty, ahead, behind } : undefined;
};

const oneLine = (text: string): string =>
	(text.trim().split("\n")[0] ?? "").replace(CONTROL_CHARS, "").slice(0, 120);

/** A folder that is no repository gives `undefined`: `git status` exits with 128 and `git rev-parse --git-dir` fails too. The check reads exit codes and no message, so the language of `git` does not matter. */
const runGit = async (
	dir: string,
	{ runner, env }: GitPorts,
): Promise<GitView> => {
	const git = (args: string[]) =>
		runner.run("git", args, { cwd: dir, timeout: GIT_TIMEOUT_MS, env });
	try {
		const result = await git(["status", "--porcelain=v2", "-b"]);
		if (result.timedOut) {
			return { error: `git did not answer in ${GIT_TIMEOUT_MS} ms` };
		}
		if (result.exitCode === 0) {
			return parseStatus(result.stdout);
		}
		if (
			result.exitCode === 128 &&
			(await git(["rev-parse", "--git-dir"])).exitCode !== 0
		) {
			return undefined;
		}
		const how =
			result.exitCode === null
				? `ended by ${result.signal ?? "a signal"}`
				: `exited with ${result.exitCode}`;
		const why = oneLine(result.stderr);
		return { error: `git ${how}${why ? `: ${why}` : ""}` };
	} catch (err) {
		return {
			error:
				oneLine(err instanceof Error ? err.message : String(err)) ||
				"git did not run",
		};
	}
};

/**
 * A fresh saved view is given with no `git` run. Otherwise `git` runs and the view is saved, a fault too, so a failing `git` runs once for each window.
 * A fault, an unreadable cache, and a failed write go to `onError`. With no safe cache folder, nothing is read or written.
 */
export const cachedGitState = async (
	dir: string,
	ports: GitPorts,
	onError: (text: string) => void,
): Promise<GitView> => {
	const file = await cacheFile(dir);
	const now = ports.now();
	const attempt = async <T>(run: () => Promise<T>): Promise<T | undefined> =>
		run().catch((err) => void onError(failureText(err)));
	if (file !== undefined) {
		// A torn or damaged file is no cache.
		const fresh = freshView(
			(await attempt(() => ports.files.read(file))) ?? "",
			now,
		);
		if (fresh) {
			return fresh.view;
		}
	}
	const view = await runGit(dir, ports);
	if (view && "error" in view) {
		onError(`git: ${view.error}`);
	}
	if (file !== undefined) {
		await attempt(() =>
			ports.write(
				file,
				`${JSON.stringify({ at: now, state: view ?? null })}\n`,
			),
		);
	}
	return view;
};
