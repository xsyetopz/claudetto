import type { EngineInterface, On } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "./chain.ts";
import { didWrite } from "./limits/turn.ts";
import { PERSON, rootOf } from "./pin.ts";
import { SLICE_COMMIT } from "./texts.ts";

const RENAMED = /^[RC]/u;

async function git(
	$: EngineInterface,
	argv: string[],
): Promise<string | undefined> {
	const r = await $.process.run(["git", ...argv]).catch((error: unknown) => {
		$.ui.log(`The git ${argv[0]} call failed (${String(error)})`);
	});
	return r?.exitCode === 0 ? r.stdout : undefined;
}

async function hashOne($: EngineInterface, file: string): Promise<string> {
	const out = await git($, ["hash-object", "--", file]);
	return out?.trim() ?? "";
}

/** The blob hash of each file, "" for one git cannot read; one call, or one per file when the batch fails on a vanished file. */
async function hashes(
	$: EngineInterface,
	files: readonly string[],
): Promise<string[]> {
	if (files.length === 0) {
		return [];
	}
	const awaited = await git($, ["hash-object", "--", ...files]);
	const all = awaited?.trimEnd().split("\n");
	return all?.length === files.length
		? all
		: Promise.all(files.map((f) => hashOne($, f)));
}

/** The changed paths of a `git status --porcelain -z` output, each with whether it is deleted. */
const entriesOf = (
	status: string,
	root: string,
): { path: string; gone: boolean }[] => {
	const fields = status.split("\0");
	const entries: { path: string; gone: boolean }[] = [];
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i] ?? "";
		if (field !== "") {
			entries.push({
				path: `${root}/${field.slice(3)}`,
				gone: field.slice(0, 2).includes("D"),
			});
		}
		// A rename or copy is followed by its source path.
		i += RENAMED.test(field) ? 1 : 0;
	}
	return entries;
};

/** Absolute path -> hash of each path the cwd's repo reports as changed; a deleted path has hash "". */
const dirty = async ($: EngineInterface): Promise<Map<string, string>> => {
	const [status, up, cwd] = await Promise.all([
		git($, ["status", "--porcelain", "-z", "-uall"]),
		git($, ["rev-parse", "--show-cdup"]),
		$.session.cwd(),
	]);
	const root = rootOf(cwd, (up ?? "").trim());
	const entries = entriesOf(status ?? "", root);
	const live = entries.filter((e) => !e.gone);
	const hashed = await hashes(
		$,
		live.map((e) => e.path),
	);
	const out = new Map(entries.map((e) => [e.path, ""]));
	for (const [i, e] of live.entries()) {
		out.set(e.path, hashed[i] ?? "");
	}
	return out;
};

const shown = async ($: EngineInterface, paths: readonly string[]) => {
	const cwd = await $.session.cwd();
	return paths.map((p) =>
		p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p,
	);
};

/** The files of `mine` that still hold the hash the agent left and that git reports as changed. */
const changedOf = async (
	$: EngineInterface,
	mine: ReadonlyMap<string, string>,
): Promise<string[]> => {
	const files = [...mine.keys()];
	const now = await hashes($, files);
	const own = files.filter((path, i) => now[i] === mine.get(path));
	const status = await Promise.all(
		own.map((path) =>
			git($, [
				"-C",
				path.slice(0, path.lastIndexOf("/")),
				"status",
				"--porcelain",
				"--",
				path,
			]),
		),
	);
	return own.filter((_, i) => (status[i] ?? "") !== "");
};

/** Whether the commit that the block asks for could be made: a headless session has no one to answer an ask. */
const commitPossible = async (
	$: EngineInterface,
	interactive: boolean,
): Promise<boolean> => {
	const commit = await $.tool.check({
		tool: "Bash",
		input: { command: "git commit" },
	});
	return !(
		commit.decision === "deny" ||
		(commit.decision === "ask" && !interactive)
	);
};

/** The paths of the cwd repo that differ from `known` and are not in `changed`; none without a first-prompt record. */
const movedSince = async (
	$: EngineInterface,
	known: ReadonlyMap<string, string> | undefined,
	changed: readonly string[],
): Promise<string[]> =>
	known === undefined
		? []
		: [...(await dirty($))]
				.filter(
					([path, hash]) => known.get(path) !== hash && !changed.includes(path),
				)
				.map(([path]) => path);

/** The agent's written files, by the hash it left each with. */
export type SlicesState = Map<string, string>;

/** Makes the written-files record of one session. */
export const slicesState = (): SlicesState => new Map();

/** Records the hash of each file that an `Edit`, `Write`, or `NotebookEdit` wrote. */
export async function slicesCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
	mine: SlicesState,
): Promise<Awaited<CallAnswer>> {
	if (e.tool !== "Edit" && e.tool !== "Write" && e.tool !== "NotebookEdit") {
		return next(e);
	}
	const answer = await next(e);
	const path = e.tool === "NotebookEdit" ? e.notebook_path : e.file_path;
	if (didWrite(answer)) {
		const awaited2 = await hashes($, [path]);
		mine.set(path, awaited2[0] ?? "");
	}
	return answer;
}

/** The block that asks for the commits; none when no commit could be made or nothing moved. */
const sliceBlock = async (
	$: EngineInterface,
	mine: ReadonlyMap<string, string>,
	known: ReadonlyMap<string, string> | undefined,
	interactive: boolean,
): Promise<string | undefined> => {
	if (!(await commitPossible($, interactive))) {
		return undefined;
	}
	const changed = await changedOf($, mine);
	const others = await movedSince($, known, changed);
	return changed.length === 0 && others.length === 0
		? undefined
		: SLICE_COMMIT(await shown($, changed), await shown($, others));
};

/**
 * Files the agent wrote, by the hash it left them with: only an `Edit`, `Write`, or `NotebookEdit` that ran counts, since a Bash call cannot
 * tell the agent's change from a formatter's or the user's. Every other file in the cwd's repo that moved since the session's first prompt,
 * a file the agent wrote and another hand changed since included, is asked for as its own commit under its likely source.
 */
export const slices = (on: On, mine: SlicesState): void => {
	// The cwd repo's changed files at the session's first prompt.
	let known: Map<string, string> | undefined;
	let interactive = true;
	on("session.start", { isInteractive: [true, false] }, (_$, e, next) => {
		interactive = e.isInteractive;
		return next(e);
	});
	on("prompt.submit", { origin: { kind: PERSON } }, async ($, e, next) => {
		known ??= await dirty($);
		return next(e);
	});
	on("classic.Stop", { stop_hook_active: false }, async ($, e, next) => {
		const answer = await next(e);
		if (
			answer.block !== undefined ||
			(mine.size === 0 && known === undefined)
		) {
			return answer;
		}
		const block = await sliceBlock($, mine, known, interactive);
		return block === undefined ? answer : { ...answer, block };
	});
};
