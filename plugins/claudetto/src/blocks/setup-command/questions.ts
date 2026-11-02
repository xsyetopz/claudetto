// The dialog takes 2 to 4 labels per question, so a group is cut to fit, and an answer is read back by its labels.

import { KEY_GROUPS } from "../../tiers/groups.ts";
import type { Difference } from "./diff.ts";
import { rememberNotes } from "./notes.ts";
import { CODE_RULES } from "./rules.ts";

export const KEEP_MINE = "Keep mine";

const KEEP_NOTE = "Change nothing in your settings for this key.";

/** `$.ui.ask` as a closure, since the hook loader follows `$` only inside the file that holds the hook. */
export type Asker = (
	question: string,
	options: {
		readonly options: readonly string[];
		readonly header: string;
		readonly multiSelect?: true;
	},
) => Promise<string>;

export interface Question {
	readonly text: string;
	readonly header: string;
	readonly options: readonly string[];
	readonly multiSelect: boolean;
	/** What each label does, drawn under it by the render hook. */
	readonly notes: ReadonlyMap<string, string>;
}

const MAX_OPTIONS = 4;

const HEADER_MAX = 12;

const VALUE_MAX = 80;

const SANDBOX_ON = "sandbox.enabled";

const SANDBOX_OFF = "sandbox.enabled=false";

const shown = (value: unknown): string => {
	const text = JSON.stringify(value) ?? "unset";
	return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX)}...` : text;
};

const noteOf = (difference: Difference): string =>
	`${"now" in difference ? `yours ${shown(difference.now)}, ` : ""}claudetto ${shown(difference.claudetto)}${
		difference.why === undefined ? "" : `. ${difference.why}`
	}`;

const lineOf = (difference: Difference): string =>
	`- ${difference.id}: ${noteOf(difference)}`;

const questionOf = (
	group: string,
	intro: string,
	differences: readonly Difference[],
	exclusive: boolean,
): Question => {
	// One key is a yes or no, and the dialog wants two labels.
	const single = exclusive || differences.length === 1;
	return {
		text: [
			intro,
			...differences.map(lineOf),
			single ? "Which one do you keep?" : "Which do you keep?",
		].join("\n"),
		header: group.slice(0, HEADER_MAX),
		options: single
			? [...differences.map(({ id }) => id), KEEP_MINE]
			: differences.map(({ id }) => id),
		multiSelect: !single,
		notes: new Map([
			...differences.map((d): [string, string] => [d.id, noteOf(d)]),
			...(single ? [[KEEP_MINE, KEEP_NOTE] as const] : []),
		]),
	};
};

const chunks = <T>(items: readonly T[], size: number): T[][] => {
	const out: T[][] = [];
	for (let at = 0; at < items.length; at += size) {
		out.push(items.slice(at, at + size));
	}
	return out;
};

const groupQuestions = (
	group: string,
	differences: readonly Difference[],
): readonly Question[] => {
	const why = KEY_GROUPS.find((g) => g.label === group)?.why;
	const exclusive = differences.filter(
		({ id }) => id === SANDBOX_ON || id === SANDBOX_OFF,
	);
	const pair = exclusive.length === 2;
	const rest = pair
		? differences.filter((d) => !exclusive.includes(d))
		: differences;
	const pieces = chunks(rest, MAX_OPTIONS);
	const questions = pieces.map((piece, at) =>
		questionOf(
			group,
			at === 0 ? `${group}. ${why ?? ""}` : group,
			piece,
			false,
		),
	);
	return pair
		? [
				questionOf(
					group,
					`${group}. Only one of these can hold.`,
					exclusive,
					true,
				),
				...questions,
			]
		: questions;
};

/** One question per group, cut to four options; the sandbox pair and the code rules file are asked alone. */
export const questionsOf = (
	differences: readonly Difference[],
): readonly Question[] => {
	const groups = new Map<string, Difference[]>();
	for (const difference of differences) {
		groups.set(difference.group, [
			...(groups.get(difference.group) ?? []),
			difference,
		]);
	}
	return [...groups].flatMap(([group, held]) =>
		group === rulesGroup(held)
			? [
					questionOf(
						group,
						`${group}. Writes claudetto's code rules to your rules folder.`,
						held,
						true,
					),
				]
			: groupQuestions(group, held),
	);
};

const rulesGroup = (held: readonly Difference[]): string | undefined =>
	held.length === 1 && held[0]?.id === CODE_RULES ? held[0].group : undefined;

const askOne = async (
	ask: Asker,
	question: Question,
): Promise<readonly string[] | undefined> => {
	rememberNotes(question.text, question.notes);
	let answer: string;
	try {
		answer = await ask(question.text, {
			options: question.options,
			header: question.header,
			...(question.multiSelect ? { multiSelect: true } : {}),
		});
	} catch {
		return undefined;
	}
	return answer
		.split(",")
		.map((label) => label.trim())
		.filter((label) => label !== KEEP_MINE && question.options.includes(label));
};

/** One dialog at a time, since each waits for the person. */
const askFrom = async (
	ask: Asker,
	questions: readonly Question[],
	kept: readonly string[],
): Promise<readonly string[] | undefined> => {
	const [question, ...rest] = questions;
	if (question === undefined) {
		return kept;
	}
	const chosen = await askOne(ask, question);
	return chosen === undefined
		? undefined
		: askFrom(ask, rest, [...kept, ...chosen]);
};

/** The ids the user kept, or `undefined` when a dialog was dismissed or none can open. */
export const askKept = (
	ask: Asker,
	differences: readonly Difference[],
): Promise<readonly string[] | undefined> =>
	askFrom(ask, questionsOf(differences), []);
