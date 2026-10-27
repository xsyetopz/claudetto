// The mod handlers of the `hygiene` slice (spec `session-hygiene`, D12 of change `0-3-0`): the cleanup at session start, and the edit ledger.
// The first run of `session.start` holds the first prompt, so the sweep runs after the hook returns.
// The count goes to `$.ui.log`, which the model does not read (D48).

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { isRecord } from "../../../jev/domain/jev.ts";
import { GONE, hash64 } from "../../../project/domain/ledger.ts";
import { titleHeadings } from "../domain/headings.ts";
import { afterEdit } from "../domain/intent.ts";
import { HEADINGS_FILE_MAX } from "../limits.ts";
import { HEADINGS_CASED } from "../prompts.ts";
import { hashOf, record } from "./ledger-file.ts";
import { ignoreState, moveState, sweep } from "./sweep.ts";
import { bashLines } from "./work-files.ts";

/** The calls of the engine that the helpers of this slice use. They take no `$`, so that `claude plugin validate` follows `$` in this file alone. */
const portOf = ($: EngineInterface) => ({
	clock: { now: () => $.clock.now() },
	env: {
		CLAUDE_CODE_TMPDIR: () => $.env.get("CLAUDE_CODE_TMPDIR"),
		CLAUDE_CONFIG_DIR: () => $.env.get("CLAUDE_CONFIG_DIR"),
		HOME: () => $.env.get("HOME"),
		TMPDIR: () => $.env.get("TMPDIR"),
	},
	fs: {
		exists: (path: string) => $.fs.exists(path),
		read: (path: string) => $.fs.read(path),
		write: (path: string, text: string) => $.fs.write(path, text),
		stat: (path: string) => $.fs.stat(path),
		realPath: async (path: string) =>
			(await $.fs.stat(path, { resolve: true })).realPath,
	},
	process: {
		run: (argv: string[], options: { cwd?: string; timeoutMs: number }) =>
			$.process.run(argv, options),
	},
	session: {
		root: () => $.session.root(),
		id: () => $.session.id(),
		cwd: () => $.session.cwd(),
	},
	settings: {
		read: (query: { key: "cleanupPeriodDays" }) => $.settings.read(query),
	},
	store: {
		get: (key: string) => $.store.get(key),
		set: (key: string, value: unknown) => $.store.set(key, value),
	},
	ui: { log: (text: string) => $.ui.log(text) },
});

const MARKDOWN_FILE = /\.md$/i;

/** Starts the sweep and does not wait for it. */
export const onStart: Handler<"session.start"> = async ($, e, next) => {
	void sweep(portOf($)).catch(() => undefined);
	await moveState(portOf($)).catch(() => undefined);
	await ignoreState(portOf($)).catch(() => undefined);
	return next(e);
};

const editedPath = (input: unknown): string | null => {
	const path = isRecord(input) ? input["file_path"] : undefined;
	return typeof path === "string" && path !== "" ? path : null;
};

/** Sets the Title Case of the headings of the Markdown file `path`, and gives the count that changed. An unreadable, unwritable, or huge file stays as it is. */
const titleFile = async ($: EngineInterface, path: string): Promise<number> => {
	try {
		const text = await $.fs.read(path);
		if (text.length > HEADINGS_FILE_MAX) {
			return 0;
		}
		const fixed = titleHeadings(text);
		if (fixed.changed === 0) {
			return 0;
		}
		await $.fs.write(path, fixed.text);
		return fixed.changed;
	} catch {
		return 0;
	}
};

/** Records an `Edit` or `Write` of `path` after the headings of a `.md` file get their case (before the hash). Gives the line for the model when a heading changed. */
const recordEdit = async (
	$: EngineInterface,
	path: string | null,
	session: string,
	agent: string,
): Promise<string | undefined> => {
	if (path === null) {
		return undefined;
	}
	const count = MARKDOWN_FILE.test(path) ? await titleFile($, path) : 0;
	const hash = await hashOf(portOf($), path);
	if (hash !== GONE) {
		await record(portOf($), [{ path, hash, session, agent, via: "edit" }]);
	}
	return count > 0 ? HEADINGS_CASED({ path, count }) : undefined;
};

type IntentHook = MatchedHook<
	"classic.PreToolUse",
	{ readonly tool: readonly ["Edit", "Write"] }
>;

/** The text that the call `e` will write, or `undefined` when the read fails or `old_string` does not match. */
const intended = async (
	$: EngineInterface,
	e: Parameters<IntentHook>[1],
): Promise<string | undefined> => {
	if (e.tool === "Write") {
		return typeof e.content === "string" ? e.content : undefined;
	}
	const { old_string: old, new_string: next, replace_all: all } = e;
	if (typeof old !== "string" || typeof next !== "string") {
		return undefined;
	}
	return (
		afterEdit(await $.fs.read(e.file_path), old, next, all === true) ??
		undefined
	);
};

/** `classic.PreToolUse` on `Edit` and `Write`: the ledger gets a line with the hash of the content that the call will write, so a write that lands during a `Bash` call of another agent has its proof. A failure never stops the call. */
export const onIntent: IntentHook = async ($, e, next) => {
	try {
		const text = await intended($, e);
		if (text !== undefined && e.file_path !== "") {
			await record(portOf($), [
				{
					path: e.file_path,
					hash: hash64(text),
					session: await $.session.id(),
					// The line of `classic.PostToolUse` replaces this one and names the agent.
					agent: "main",
					via: "edit",
				},
			]);
		}
	} catch {
		// The ledger is a help for the agent, so a fault of it adds no stop.
	}
	return next(e);
};

/** `classic.PostToolUse`: the ledger keeps the files of an `Edit`, a `Write`, or a `Bash` call. A failure of the ledger never stops the tool result. */
export const onEdited: Handler<"classic.PostToolUse"> = async ($, e, next) => {
	let note: string | undefined;
	try {
		const session = await $.session.id();
		const agent = e.agent_id ? (e.agent_type ?? e.agent_id) : "main";
		if (e.tool_name === "Bash") {
			await record(
				portOf($),
				await bashLines(portOf($), session, agent, e.duration_ms),
			);
		} else {
			note = await recordEdit($, editedPath(e.tool_input), session, agent);
		}
	} catch {
		// The ledger is a help for the agent, so a fault of it adds no stop.
	}
	const answer = await next(e);
	return note === undefined
		? answer
		: {
				...answer,
				additionalContext: [...(answer.additionalContext ?? []), note],
			};
};
