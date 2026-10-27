// The mod handlers of the `notes` slice (spec `side-notes`): a note above the prompt, with no model call.
// A note comes from a rule (the same deny, ask, or failing check 3 times), from the `learn:` block of a main reply, or from `finish` through the `$.state` key `note`.

import type { EngineInterface, MatchedHook } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { isCheck } from "../../../project/domain/checks.ts";
import { userEdits } from "../../../project/domain/edits.ts";
import {
	PROJECT_LOCAL_SETTINGS,
	PROJECT_SETTINGS,
} from "../../../project/domain/paths.ts";
import type { Note } from "../../domain/notes.ts";
import { type Task, track, whatOf } from "../domain/background.ts";
import {
	admit,
	clearFail,
	countAsk,
	countFail,
	EMPTY,
	type Notes,
	signOf,
	typedPast,
	used,
} from "../domain/counters.ts";
import { learnFilter, parseLearn } from "../domain/learn.ts";
import { GIT_TIMEOUT_MS, REPEAT_MIN } from "../limits.ts";
import {
	BACKGROUND_NOTE,
	CHECK_NOTE,
	INSERT_INTRO,
	KEY_INSERT,
	KEY_OFF,
	REPEAT_NOTE,
	USER_EDIT_NOTE,
} from "../prompts.ts";

const notesRef = { plugin: "claudetto", key: "notes" } as const;
const pendingRef = { plugin: "claudetto", key: "note" } as const;

const PARENT_DIR = /\/[^/]*$/;

/** Writes the state that `next` gives, and tries again when another write landed first. */
const apply = async <R extends { state: Notes }>(
	$: EngineInterface,
	next: (state: Notes) => R,
): Promise<R> => {
	const { value, version } = await $.state.get(notesRef);
	const result = next(value ?? EMPTY);
	const { isSet } = await $.state.set(notesRef, result.state, {
		ifVersion: version,
	});
	return isSet ? result : apply($, next);
};

const change = ($: EngineInterface, next: (state: Notes) => Notes) =>
	apply($, (state) => ({ state: next(state) }));

/** Shows `note`, if the counters allow it. */
const raise = ($: EngineInterface, note: Note) =>
	change($, (state) => admit(state, note));

/** Shows the note that `finish` left in `$.state`, once. */
const takePending = async ($: EngineInterface): Promise<void> => {
	const { value } = await $.state.get(pendingRef);
	if (!value) {
		return;
	}
	await $.state.set(pendingRef, null);
	await raise($, value);
};

/** The first of `files` under `root` that holds `rule`, read in order, or `null`. */
const holding = async (
	$: EngineInterface,
	root: string,
	rule: string,
	files: readonly string[],
): Promise<string | null> => {
	const [file, ...rest] = files;
	if (file === undefined) {
		return null;
	}
	const text = await $.fs.read(`${root}/${file}`).catch(() => "");
	return text.includes(rule) ? file : holding($, root, rule, rest);
};

/** The settings file of the project that holds `rule`, or a generic name. */
const settingsOf = async (
	$: EngineInterface,
	rule: string,
): Promise<string> => {
	const root = await $.session.root().catch(() => "");
	return (
		(await holding($, root, rule, [
			PROJECT_LOCAL_SETTINGS,
			PROJECT_SETTINGS,
		])) ?? "your settings files"
	);
};

type CheckHook = MatchedHook<
	"tool.check",
	{
		readonly tool: readonly [
			"Bash",
			"Edit",
			"Glob",
			"Grep",
			"Read",
			"WebFetch",
			"Write",
		];
	}
>;

/** The field `key` of a tool input, or `undefined` when the input is no object. */
const fieldOf = (input: unknown, key: string): unknown =>
	typeof input === "object" && input !== null
		? Object.entries(input).find(([k]) => k === key)?.[1]
		: undefined;

/** The path of an `Edit` or `Write` that has a change which no session made, as `git status` shows it, else `null`. The ledger is the file that `hygiene` writes. */
const userEdited = async (
	$: EngineInterface,
	path: string,
): Promise<string | null> => {
	const dir = path.replace(PARENT_DIR, "") || "/";
	const [rel] = await userEdits(
		{
			git: (args) =>
				$.process.run(["git", "-C", dir, ...args], {
					timeoutMs: GIT_TIMEOUT_MS,
				}),
			read: (file) => $.fs.read(file),
			exists: (file) => $.fs.exists(file),
			tmp: () => $.env.get("TMPDIR"),
			root: () => $.session.root(),
		},
		path,
	);
	return rel ?? null;
};

/** The rule "user edit": an allowed `Edit` or `Write` of a file with a change of the user sets a note. A failure of the rule sets none. */
const checkUserEdit = async (
	$: EngineInterface,
	tool: string,
	input: unknown,
): Promise<void> => {
	const path = fieldOf(input, "file_path");
	if ((tool !== "Edit" && tool !== "Write") || typeof path !== "string") {
		return;
	}
	const rel = await userEdited($, path).catch(() => null);
	if (rel) {
		await raise($, USER_EDIT_NOTE({ path: rel }));
	}
};

/** `tool.check`: counts each deny and ask by rule. The third one of a rule sets a note. */
export const onCheck: CheckHook = async ($, e, next) => {
	const verdict = await next(e);
	if (verdict.decision === "allow") {
		await checkUserEdit($, e.tool, e.input);
	}
	const rule = verdict.rule ?? verdict.reason;
	if (verdict.decision === "allow" || !rule) {
		return verdict;
	}
	const { count } = await apply($, (state) => countAsk(state, rule));
	if (count === REPEAT_MIN) {
		await raise(
			$,
			REPEAT_NOTE({
				kind: verdict.decision === "deny" ? "deny" : "ask",
				rule,
				count,
				where: await settingsOf($, rule),
			}),
		);
	}
	return verdict;
};

/** The command of a `Bash` input when it is a check, else `null`. */
const checkOf = (input: unknown): string | null => {
	const command = fieldOf(input, "command");
	const text = typeof command === "string" ? command.trim() : "";
	return isCheck(text) ? text : null;
};

/** `classic.PostToolUseFailure` of `Bash`: a failing check command in a row with the same failing test sets a note on the third. */
export const onFail: Handler<"classic.PostToolUseFailure"> = async (
	$,
	e,
	next,
) => {
	const answer = await next(e);
	const command = checkOf(e.tool_input);
	if (!command) {
		return answer;
	}
	const sign = signOf(e.error);
	const { count } = await apply($, (state) => countFail(state, command, sign));
	if (count === REPEAT_MIN) {
		await raise($, CHECK_NOTE({ command, count, sign }));
	}
	return answer;
};

/** `classic.PostToolUse` of `Bash`: a check that passes ends its streak of failures. */
export const onPass: Handler<"classic.PostToolUse"> = async ($, e, next) => {
	const answer = await next(e);
	const command = checkOf(e.tool_input);
	if (command) {
		await change($, (state) => clearFail(state, command));
	}
	return answer;
};

/** `classic.Stop`: a background task in flight for 30 minutes sets a note, once for each task. Tasks that are gone leave the record. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
	const answer = await next(e);
	if (e.agent_id !== undefined) {
		return answer;
	}
	const now = await $.clock.now().catch(() => null);
	if (now === null) {
		return answer;
	}
	const tasks: Task[] = e.background_tasks ?? [];
	const { late, minutes } = await apply($, (state) => track(state, tasks, now));
	if (late) {
		await raise($, BACKGROUND_NOTE({ what: whatOf(late), minutes }));
	}
	return answer;
};

type Returned<G> =
	G extends AsyncGenerator<unknown, infer R, unknown> ? R : never;

/** `turn.step` of the main loop: the `learn:` block sets a note, and it is not shown or recorded. A non-text chunk ends the text before it. */
export const onStep: Handler<"turn.step"> = async function* ($, e, next) {
	if (e.agentId !== undefined) {
		return yield* next(e);
	}
	const stream = next(e);
	// `for await` drops the return value of the stream, so a relay keeps it.
	const finished: { value?: Returned<typeof stream> } = {};
	const relay = async function* () {
		finished.value = yield* stream;
	};
	let filter = learnFilter();
	let index = 0;
	for await (const c of relay()) {
		if (c.kind === "text") {
			index = c.index;
			const text = filter.push(c.text);
			if (text) {
				yield { ...c, text };
			}
			continue;
		}
		const text = filter.end();
		filter = learnFilter();
		if (text) {
			yield { kind: "text", index, text };
		}
		yield c;
	}
	const result = finished.value;
	if (result === undefined) {
		return;
	}
	const { note } = parseLearn(result.answer);
	if (note) {
		await raise($, note);
	}
	return result;
};

/** `turn.complete` of the main loop: a note that `finish` left shows. */
export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
	const answer = await next(e);
	if (e.agentId === undefined) {
		await takePending($);
	}
	return answer;
};

/** `turn.start` of the main loop with a typed prompt: the shown note stays one prompt less, and a note that `finish` left shows. */
export const onPrompt: Handler<"turn.start"> = async ($, e, next) => {
	const answer = await next(e);
	if (e.agentId !== undefined || e.text === "") {
		return answer;
	}
	await change($, typedPast);
	await takePending($);
	return answer;
};

/** The press of the insert key: the note and its explanation go into the prompt box. */
const insert = async ($: EngineInterface, note: Note): Promise<void> => {
	await $.prompt.fill({
		text: `${INSERT_INTRO}\n${note.tag} · ${note.line}\n${note.explain}`,
		mode: "replace",
	});
	await change($, used);
};

/** `ui.render` of `AbovePrompt`: the shown note with its two keys, or one dim key to turn notes on again. */
type BandHook = MatchedHook<"ui.render", { readonly component: "AbovePrompt" }>;

export const onBand: BandHook = async ($, e, next) => {
	if (e.props.hasSurvey) {
		return next(e);
	}
	const { value: state } = await $.state.get(notesRef);
	const { Box, Text, Button } = $.ui.resolve(e);
	const key = (k: string, hotkey: string, label: string, run: () => unknown) =>
		Button({
			key: k,
			hotkey,
			plain: true,
			dimColor: k !== "insert",
			label,
			onPress: () => void run(),
		});
	if (state?.isOff) {
		return key("on", "3", "3: Turn notes on", () =>
			change($, (s) => ({ ...s, isOff: false })),
		);
	}
	const note = state?.shown;
	if (!note) {
		return next(e);
	}
	return Box({
		children: [
			Text({ children: `${note.tag} · ${note.line}` }),
			key("insert", "1", KEY_INSERT, () => insert($, note)),
			key("off", "2", KEY_OFF, () =>
				change($, (s) => ({ ...s, isOff: true, shown: null })),
			),
		],
	});
};

/** `ui.render` of `AssistantMessage`: the `learn:` block is not drawn. The stored message stays as it is. */
type MessageHook = MatchedHook<
	"ui.render",
	{ readonly component: "AssistantMessage" }
>;

export const onMessage: MessageHook = (_$, e, next) => {
	const { shown } = parseLearn(e.props.text);
	return shown === e.props.text
		? next(e)
		: next({ ...e, props: { ...e.props, text: shown } });
};
