// The trust of the `protect` slice: whether a changed or deleted file is the effect of a commit that git had, or that a remote has.

import type { LedgerLine } from "../../../project/domain/ledger.ts";
import {
	changedStamps,
	type Known,
	movedRemotes,
	networkUrl,
	parseRefs,
	parseUrls,
	remoteOf,
	transportOf,
} from "../domain/protect.ts";
import {
	GIT_COMMITS_MAX,
	GIT_TIMEOUT_MS,
	LS_REMOTE_TIMEOUT_MS,
} from "../limits.ts";
import { OPAQUE_REASONS, STAMP_NAMES, STAMP_UNREADABLE } from "../prompts.ts";
import { textOf } from "./files.ts";
import { git, REFS, REMOTES, stampsOf } from "./git.ts";
import type { Io } from "./io.ts";

const WHITESPACE = /\s/;

/** What the undo reads: the project root, its real path, and the files that the call reported (`undefined` when the field cannot be used). */
export interface Look {
	root: string;
	realRoot: string;
	reported: string[] | undefined;
	known: Known | undefined;
	/** The edit ledger, read once for the call: a line of `edit` is the proof of an `Edit` or `Write`. */
	ledger: readonly LedgerLine[];
	moved?: [string, string][];
	/** The reasons, as clauses, that a remote was not trusted: a stamp that changed, or an `ssh` config that the code cannot read. */
	why: string[];
	/** The stamps that changed, read once. */
	shifted?: string[];
}

/** The blob id of `rel` in each commit of `shas`, in order, or `""` for a commit that has no such file. One `git cat-file --batch-check` run answers for all, so a repo with many refs costs one run. */
const blobIds = async (
	io: Io,
	root: string,
	shas: string[],
	rel: string,
): Promise<string[]> => {
	const out =
		shas.length === 0
			? ""
			: await git(
					io,
					root,
					["cat-file", "--batch-check"],
					GIT_TIMEOUT_MS,
					`${shas.map((sha) => `${sha}:${rel}`).join("\n")}\n`,
				);
	const lines = (out ?? "").split("\n");
	return shas.map((_, i) => {
		const [id, type] = (lines[i] ?? "").split(" ");
		return type === "blob" && id !== undefined ? id : "";
	});
};

/** The reasons that `git ls-remote` is not the same as at the pin, read once for each look: each stamp that changed, or all when the pin has none. A call can change them with `git config`, with a write of a config file, or of `~/.ssh/config`, and `git remote -v` shows none of it (`url.<base>.insteadOf` for the pinned URL, `core.sshCommand`, `http.proxy`, `include.path`). */
const shifted = async (io: Io, look: Look): Promise<string[]> => {
	const before = look.known?.stamps;
	const now = await stampsOf(io, look.root);
	if (before === undefined || now === undefined) {
		return [STAMP_UNREADABLE];
	}
	return changedStamps(before, now.stamps).map(
		(source) =>
			`${STAMP_NAMES[source] ?? `\`${source}\``} changed since the first \`Bash\` call`,
	);
};

/** True when the remote of `ref` has `sha` at the branch of `ref` now. Only the URL that the remote had at the first `Bash` call counts, and only when it is a network URL: a call can set `remote.<name>.url`, add a remote, or write a path, and then fetch its own commit. `git ls-remote` runs against the pinned URL, not the name. A remote with no pinned URL, or whose URL changed, is false. It is false also when a stamp of the settings that `git ls-remote` reads changed (`shifted`), or when the remote is on `ssh` and `~/.ssh/config` has a line that the code cannot read. The reason goes to `look.why`. A reflog message can be set with `update-ref -m`, so it proves nothing. A failure is false. */
const atRemote = async (
	io: Io,
	look: Look,
	[sha, ref]: [string, string],
): Promise<boolean> => {
	const on = remoteOf(ref);
	const pinned = on && look.known?.urls[on[0]];
	if (!on || !pinned || !networkUrl(pinned)) {
		return false;
	}
	const now = parseUrls((await git(io, look.root, REMOTES)) ?? "")[on[0]];
	if (now !== pinned) {
		return false;
	}
	look.shifted ??= await shifted(io, look);
	const reasons = [
		...look.shifted,
		...(look.known?.opaque ?? [])
			.filter((code) => code === "all" || code === transportOf(pinned))
			.map((code) => OPAQUE_REASONS[code] ?? code),
	];
	for (const reason of reasons) {
		if (!look.why.includes(reason)) {
			look.why.push(reason);
		}
	}
	if (reasons.length > 0) {
		return false;
	}
	const out = await git(
		io,
		look.root,
		["ls-remote", pinned, on[1]],
		LS_REMOTE_TIMEOUT_MS,
	);
	return out !== undefined && out !== "" && out.split(WHITESPACE)[0] === sha;
};

/** The blob ids that the text of the file at `path` has, as it is and with `\r\n` changed to `\n`, from stdin. A call can set a filter and `core.autocrlf` is common on WSL2, so no filter runs: the work-tree text of a checkout differs from the blob by `\r` only. */
const hashes = async (
	io: Io,
	root: string,
	path: string,
): Promise<string[]> => {
	const text = await textOf(io, path);
	if (text === undefined) {
		return [];
	}
	const ids = await Promise.all(
		[...new Set([text, text.replaceAll("\r\n", "\n")])].map(async (body) =>
			(
				await git(io, root, ["hash-object", "--stdin"], GIT_TIMEOUT_MS, body)
			)?.trim(),
		),
	);
	return ids.flatMap((id) => (id ? [id] : []));
};

/** The remote-tracking refs that moved since the first `Bash` call, as `[sha, ref]`, bounded and read once for each look. */
const movedOf = async (io: Io, look: Look, known: Known) => {
	look.moved ??= movedRemotes(
		known,
		parseRefs((await git(io, look.root, REFS)) ?? ""),
	).slice(0, GIT_COMMITS_MAX);
	return look.moved;
};

/** True when one of `refs` is at the remote, asked in order and until the first yes, because each ask can add to `look.why`. */
const someAtRemote = async (
	io: Io,
	look: Look,
	refs: [string, string][],
): Promise<boolean> => {
	const [ref, ...rest] = refs;
	if (ref === undefined) {
		return false;
	}
	return (await atRemote(io, look, ref)) || someAtRemote(io, look, rest);
};

/** True when the file at `rel` is the blob of a commit that git had at the first `Bash` call of the session, else of a remote-tracking ref that moved since then and that the remote has too. The compare is by blob id, so the file is hashed once and the commits are looked up in one run. The network is asked only after the commits from before did not match. */
export const fromGit = async (
	io: Io,
	look: Look,
	rel: string,
): Promise<boolean> => {
	if (look.known === undefined) {
		return false;
	}
	const now = await hashes(io, look.root, `${look.root}/${rel}`);
	if (now.length === 0) {
		return false;
	}
	const commits = [...new Set(look.known.commits)].slice(0, GIT_COMMITS_MAX);
	if (
		(await blobIds(io, look.root, commits, rel)).some((id) => now.includes(id))
	) {
		return true;
	}
	const moved = await movedOf(io, look, look.known);
	const ids = await blobIds(
		io,
		look.root,
		moved.map(([sha]) => sha),
		rel,
	);
	return someAtRemote(
		io,
		look,
		moved.filter((_, i) => now.includes(ids[i] ?? "")),
	);
};

/** True when the file at `rel` is gone from the work tree, was in the `HEAD` of the first `Bash` call, and the `HEAD` now has no such file, where this `HEAD` is a commit from before the session or a remote-tracking ref that moved and that the remote has too, and the index equals this `HEAD` (`git diff-index --cached` lists nothing): the effect of `git checkout`, `git switch`, or `git pull`, not of `rm`. A `HEAD` that has the file, or that the call made, is no reason to leave it deleted. A `HEAD` that a call moved with `git symbolic-ref`, `git update-ref --no-deref HEAD`, or `git reset --soft` leaves the index as it was, so it is no reason. A `git read-tree` alone leaves `HEAD` as it was, so the index differs from it and the file is written back. A `git read-tree` after a move of `HEAD` with `git update-ref --no-deref HEAD` or `git symbolic-ref`, or a `git reset --mixed`, to a commit from before that lacks the file, after an `rm`, leaves the index equal to this `HEAD`, so the delete stays. `git reset --mixed` also moves the branch ref, which `git checkout` does not, so the end state is not the same, and it is accepted. A staged change of the user makes `git diff-index --cached` list a path, so the delete of a real `git checkout` is written back then (fail-safe). */
export const goneWithHead = async (
	io: Io,
	look: Look,
	rel: string,
): Promise<boolean> => {
	const first = look.known?.commits[0];
	const head = (await git(io, look.root, ["rev-parse", "HEAD"]))?.trim();
	if (look.known === undefined || first === undefined || !head) {
		return false;
	}
	const [was, has] = await blobIds(io, look.root, [first, head], rel);
	if (!was || has) {
		return false;
	}
	const staged = await git(io, look.root, [
		"diff-index",
		"--cached",
		"--name-only",
		"HEAD",
		"--",
	]);
	if (staged?.trim() !== "") {
		return false;
	}
	if (look.known.commits.slice(0, GIT_COMMITS_MAX).includes(head)) {
		return true;
	}
	const moved = (await movedOf(io, look, look.known)).find(
		([sha]) => sha === head,
	);
	return moved !== undefined && (await atRemote(io, look, moved));
};
