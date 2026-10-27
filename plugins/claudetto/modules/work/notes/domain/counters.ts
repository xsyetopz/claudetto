// The counters and the shown note of the slice (spec `side-notes`), kept in the `$.state` of the session.

import type { Note } from "../../domain/notes.ts";
import {
	BACKOFF_FROM,
	NOTE_PROMPTS,
	RECENT_MAX,
	SIGN_CHARS,
	SKIP_MAX,
} from "../limits.ts";

/** `shown` is the note above the prompt with its prompts left, `recent` the last shown lines, `ignored` the notes in a row that the user typed past, `skip` the checks that the back-off skips, `seen` the first `Stop` that listed each task, `asks` the denies and asks by rule, and `fails` the streak of a failing check by command. */
export interface Notes {
	readonly isOff: boolean;
	readonly shown: (Note & { readonly left: number }) | null;
	readonly recent: string[];
	readonly ignored: number;
	readonly skip: number;
	readonly seen: {
		readonly [id: string]: { readonly at: number; readonly told: boolean };
	};
	readonly asks: { readonly [rule: string]: number };
	readonly fails: {
		readonly [command: string]: {
			readonly count: number;
			readonly sign: string;
		};
	};
}

export const EMPTY: Notes = {
	isOff: false,
	shown: null,
	recent: [],
	ignored: 0,
	skip: 0,
	seen: {},
	asks: {},
	fails: {},
};

/** The count of checks to skip after `n` ignored notes in a row: `2^(n-3)` for `n` of 3 or more, up to `SKIP_MAX`. */
export const skipFor = (n: number): number =>
	n < BACKOFF_FROM ? 0 : Math.min(2 ** (n - BACKOFF_FROM), SKIP_MAX);

const same = (a: string, b: string): boolean =>
	a.trim().toLowerCase() === b.trim().toLowerCase();

/** A new note: notes off, a back-off that still skips, and a line like a recent one show nothing. Else it replaces the shown note. */
export const admit = (state: Notes, note: Note): Notes => {
	if (state.isOff) {
		return state;
	}
	if (state.skip > 0) {
		return { ...state, skip: state.skip - 1 };
	}
	if (state.recent.some((line) => same(line, note.line))) {
		return state;
	}
	return {
		...state,
		shown: { ...note, left: NOTE_PROMPTS },
		recent: [...state.recent, note.line].slice(-RECENT_MAX),
	};
};

/** A prompt of the user: the shown note stays one prompt less. A note that ends unused counts as ignored, and sets the back-off. */
export const typedPast = (state: Notes): Notes => {
	if (!state.shown) {
		return state;
	}
	if (state.shown.left > 1) {
		return { ...state, shown: { ...state.shown, left: state.shown.left - 1 } };
	}
	const ignored = state.ignored + 1;
	return { ...state, shown: null, ignored, skip: skipFor(ignored) };
};

/** The user used the note: it goes, and the run of ignored notes ends. */
export const used = (state: Notes): Notes => ({
	...state,
	shown: null,
	ignored: 0,
	skip: 0,
});

/** One more deny or ask of `rule`, and the count after it. */
export const countAsk = (state: Notes, rule: string) => {
	const count = (state.asks[rule] ?? 0) + 1;
	return { state: { ...state, asks: { ...state.asks, [rule]: count } }, count };
};

/** One more failure of `command` with the failing test `sign`: the streak goes on when the test is the same. */
export const countFail = (state: Notes, command: string, sign: string) => {
	const before = state.fails[command];
	const count = before && before.sign === sign ? before.count + 1 : 1;
	return {
		state: { ...state, fails: { ...state.fails, [command]: { count, sign } } },
		count,
	};
};

/** `command` passed: its streak ends. */
export const clearFail = (state: Notes, command: string): Notes => {
	const { [command]: _gone, ...fails } = state.fails;
	return { ...state, fails };
};

const FAIL_LINE = /^\s*(?:\(fail\)|FAIL|not ok|✗|✘)\s+(.+)$/m;

/** The line of the failing test in the output of a failed check, such as `(fail) name` or `FAIL name`, or `""` for none. */
export const signOf = (output: string): string =>
	(FAIL_LINE.exec(output)?.[1] ?? "").trim().slice(0, SIGN_CHARS);
