// The mod handlers of the `protect` slice (task 19.12 of change `redesign-0-4-0`): a `Bash` call may not change a protected file.
// `session.start` turns on `tool_response.bashEditDiff` with the env var. `classic.PreToolUse` saves the protected files that exist, in a `$.state` member of the call.
// `classic.PostToolUse` finds a changed protected file in the field, or by its content when the field has `unavailable` or `skipped` or is missing (a sandbox, or a folder that is not a git repo).
// It writes the saved content back, deletes a file that the call created, and tells the model to use `Edit`.
// A changed file stays when its content is the blob of a commit that git had at the first `Bash` call of the session (`known`): the effect of `git pull` or `git checkout` in the plan folder, not the command text.
// A moved remote-tracking ref counts only when `git ls-remote` of the URL that the remote had at the first call (a network URL, not a path) shows the same sha. A remote that is new, or whose URL changed, counts for nothing.
// `git ls-remote` reads the `git` config, the `ssh` config, some env vars, and the programs `ssh` and `git`, which a call can change without a change of `git remote -v` (`url.<base>.insteadOf`, `core.sshCommand`, `~/.ssh/config`, an `ssh` earlier in `PATH`). So the pin also holds a stamp of each source (the config without the keys that `ls-remote` never reads, such as `branch.*`), and a remote counts only when each stamp is as it was.
// A program that a setting names (`core.sshCommand`, `GIT_SSH`, `GIT_SSH_COMMAND`, `ProxyCommand`, `ProxyJump`, `LocalCommand`, `KnownHostsCommand`, `core.gitProxy`) can be rewritten with no change of any stamp, so its transport gets no trust, and the same holds for an `ssh` or `git` file below the home folder or the project. A credential helper and an askpass program cannot change the refs, so an `https` remote keeps its trust.
// The pin is taken at `session.start` when the project root is known then, else at the first `Bash` call, so an `Edit` of `.git/config` before the first `Bash` call cannot change the pin when the root is known.
// A deleted file stays deleted only when `HEAD` moved to a commit that lacks it and the index equals that `HEAD`, as after `git checkout`, so `git symbolic-ref` and `git reset --soft` do not make a delete stay.
// `git read-tree` alone does not (it leaves `HEAD` as it was, so the index differs from it), but `git read-tree` after `git update-ref --no-deref HEAD` or `git symbolic-ref` to such a commit does, and so does `git reset --mixed`, which also moves the branch ref and so does not leave the end state of `git checkout` (accepted). A staged change of the user makes a real checkout's delete get written back (fail-safe).
// The content of a changed file decides, not the command text, so `python3`, `perl`, `sed`, and a rename are the same.
// The `bashEditDiff` field cannot replace the mtime scan of `session.ledger` (`research/probe-19-12.md`).

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { ledgerKey, parseLedger } from "../../../project/domain/ledger.ts";
import { projectRoot } from "../../../project/domain/session.ts";
import { diffPaths, type Saved } from "../domain/protect.ts";
import {
	NO_COMMITS_AT_START,
	NOT_DELETED,
	NOT_TRUSTED,
	UNDONE,
} from "../prompts.ts";
import { protectedFiles, realOf, textOf } from "./files.ts";
import { binOf, pin } from "./git.ts";
import type { Io } from "./io.ts";
import type { Look } from "./trust.ts";
import { remove, restore } from "./undo.ts";

const TRAILING_SLASHES = /\/+$/;

const rootOf = async ($: EngineInterface): Promise<string> =>
	(
		await projectRoot({
			dir: () => $.env.get("CLAUDE_PROJECT_DIR"),
			root: () => $.session.root(),
		})
	).replace(TRAILING_SLASHES, "");

/** The env vars that `git` or `ssh` read for `git ls-remote`, by name, empty when not set. The name of `$.env.get` is a literal, so each variable is spelled out. */
const envOf = async (
	$: EngineInterface,
): Promise<{ [name: string]: string }> => {
	const reads = {
		HOME: $.env.get("HOME"),
		PATH: $.env.get("PATH"),
		XDG_CONFIG_HOME: $.env.get("XDG_CONFIG_HOME"),
		GIT_DIR: $.env.get("GIT_DIR"),
		GIT_EXEC_PATH: $.env.get("GIT_EXEC_PATH"),
		GIT_CONFIG_GLOBAL: $.env.get("GIT_CONFIG_GLOBAL"),
		GIT_CONFIG_SYSTEM: $.env.get("GIT_CONFIG_SYSTEM"),
		GIT_CONFIG_NOSYSTEM: $.env.get("GIT_CONFIG_NOSYSTEM"),
		GIT_CONFIG_COUNT: $.env.get("GIT_CONFIG_COUNT"),
		GIT_CONFIG_PARAMETERS: $.env.get("GIT_CONFIG_PARAMETERS"),
		GIT_SSH: $.env.get("GIT_SSH"),
		GIT_SSH_COMMAND: $.env.get("GIT_SSH_COMMAND"),
		GIT_SSH_VARIANT: $.env.get("GIT_SSH_VARIANT"),
		GIT_PROXY_COMMAND: $.env.get("GIT_PROXY_COMMAND"),
		HTTP_PROXY: $.env.get("HTTP_PROXY"),
		HTTPS_PROXY: $.env.get("HTTPS_PROXY"),
		ALL_PROXY: $.env.get("ALL_PROXY"),
		NO_PROXY: $.env.get("NO_PROXY"),
		http_proxy: $.env.get("http_proxy"),
		https_proxy: $.env.get("https_proxy"),
		all_proxy: $.env.get("all_proxy"),
		no_proxy: $.env.get("no_proxy"),
	};
	return Object.fromEntries(
		await Promise.all(
			Object.entries(reads).map(async ([name, read]) => [
				name,
				(await read.catch(() => undefined)) ?? "",
			]),
		),
	);
};

/** The reads and writes of the helpers, as closures, so that `$` stays in this file. */
const ioOf = ($: EngineInterface): Io => {
	const ref = { plugin: "claudetto", key: "bashKnown", id: "session" } as const;
	return {
		list: (path) => $.fs.list(path),
		exists: (path) => $.fs.exists(path),
		read: (path) => $.fs.read(path),
		write: (path, text) => $.fs.write(path, text),
		stat: (path) => $.fs.stat(path, { resolve: true }),
		run: (argv, init) => $.process.run(argv, init),
		env: () => envOf($),
		known: () => $.state.get(ref),
		pin: (known, version) => $.state.set(ref, known, { ifVersion: version }),
	};
};

/** True when `run` settles, false when it throws or rejects. */
const settles = async (run: () => Promise<unknown>): Promise<boolean> => {
	try {
		await run();
		return true;
	} catch {
		return false;
	}
};

/** `session.start`: turns on `tool_response.bashEditDiff`, which wins over the setting `bashEditDiffEnabled`. The probe showed the start is early enough. A refusal before the session is bound is tried again after `next`. It also starts the pin of `git` and does not wait for it, as the first run of `session.start` holds the first prompt: a fault, or a root with no `.git` entry, leaves the pin to the first `Bash` call. */
export const onDiffEnv: Handler<"session.start"> = async ($, e, next) => {
	const set = () => $.env.set("CLAUDE_CODE_BASH_EDIT_DIFF", "1");
	const early = await settles(set);
	const started = await next(e);
	if (!early) {
		await set().catch(() => undefined);
	}
	const start = async () => pin(ioOf($), await rootOf($), true);
	void start().catch(() => undefined);
	return started;
};

type SaveHook = MatchedHook<
	"classic.PreToolUse",
	{ readonly tool: readonly ["Bash"] }
>;

/** `classic.PreToolUse` on `Bash`: saves the protected files that exist. A fault leaves the call as it is. */
export const onSave: SaveHook = async ($, e, next) => {
	try {
		const io = ioOf($);
		const root = await rootOf($);
		if (root !== "") {
			const saved: Saved = {};
			const files = await Promise.all(
				(await protectedFiles(io, root)).map(async (rel) => {
					const path = `${root}/${rel}`;
					const text = await textOf(io, path);
					return text === undefined
						? undefined
						: { path, real: await realOf(io, path), text };
				}),
			);
			for (const file of files) {
				if (file !== undefined) {
					saved[file.path] = { real: file.real, text: file.text };
				}
			}
			await $.state.set(
				{ plugin: "claudetto", key: "bashSaved", id: e.tool_use_id },
				saved,
			);
			await pin(io, root);
		}
	} catch {
		// The guard is a help, and a fault of it adds no stop.
	}
	return next(e);
};

/** `classic.PostToolUse` on `Bash`: undoes the change of each protected file and tells the model to use `Edit`. */
export const onUndo: Handler<"classic.PostToolUse"> = async ($, e, next) => {
	const answer = await next(e);
	try {
		const io = ioOf($);
		const root = await rootOf($);
		if (root === "") {
			return answer;
		}
		const saved =
			(
				await $.state.get({
					plugin: "claudetto",
					key: "bashSaved",
					id: e.tool_use_id,
				})
			).value ?? {};
		await $.state.set(
			{ plugin: "claudetto", key: "bashSaved", id: e.tool_use_id },
			{},
		);
		const { value: pinned, version: told } = await $.state.get({
			plugin: "claudetto",
			key: "bashKnown",
			id: "session",
		});
		// No commit is known (fail-safe) when the pin has no `git` path, when the pinned `git` is a file that the agent can write (the marker `all`), or when `PATH` names another file now (or none).
		const known =
			pinned?.git === undefined ||
			pinned.opaque?.includes("all") ||
			(await binOf(io))?.git !== pinned.git
				? undefined
				: pinned;
		// The fail-safe has a cost that the model should know once: a pull or a checkout of a protected file is undone.
		// The flag `told` is set below, only when the line goes into the answer: a fault of the undo keeps the line for the next call.
		const notes: string[] = [];
		if (pinned?.told === false) {
			notes.push(NO_COMMITS_AT_START);
		}
		const look: Look = {
			why: [],
			known,
			root,
			realRoot: await realOf(io, root),
			reported: diffPaths(e.tool_response),
			// A fault of the store leaves no proof, so the undo runs as it did.
			ledger: parseLedger(
				await $.store.get(ledgerKey(await $.session.root())).catch(() => []),
			),
		};
		const kept: string[] = [];
		const undone = [
			...(await restore(io, look, saved)),
			...(await remove(io, look, saved, kept)),
		];
		const paths = (list: string[]) => list.map((p) => `\`${p}\``).join(", ");
		if (undone.length > 0) {
			notes.push(UNDONE({ paths: paths(undone) }));
		}
		if (kept.length > 0) {
			notes.push(NOT_DELETED({ paths: paths(kept) }));
		}
		if (undone.length > 0 && look.why.length > 0) {
			notes.push(NOT_TRUSTED({ why: look.why.join(" and ") }));
		}
		if (notes.length === 0) {
			return answer;
		}
		if (pinned?.told === false) {
			await $.state.set(
				{ plugin: "claudetto", key: "bashKnown", id: "session" },
				{ ...pinned, told: true },
				{ ifVersion: told },
			);
		}
		return {
			...answer,
			additionalContext: [...(answer.additionalContext ?? []), ...notes],
		};
	} catch {
		// The guard is a help, and a fault of it adds no stop.
		return answer;
	}
};
