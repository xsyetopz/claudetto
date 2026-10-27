// The pick of Jev for an `AskUserQuestion` call: the request, the sure picks, and the questions with the picks added.
// Jev picks for each question that has 2 or more options and is not multi-select, whatever its kind (D66), and only when a second yes or no question, `approval_<i>`, is a confident no.
// A pick is sure when its confidence reaches `MIN_CONFIDENCE`. The confidence is already measured above chance (`confidence.md`), so no second margin applies.
// The question text stays as Claude sent it, because the answers come back keyed by that text.

import { APPROVAL_MAX, MIN_CONFIDENCE, MIN_OPTIONS } from "../limits.ts";
import { ASK_APPROVAL, ASK_NOTE, ASK_PICK } from "../prompts.ts";
import { isProbability, isRecord } from "./jev.ts";
import type { Answer } from "./request.ts";

export interface AskOption {
	readonly label: string;
	readonly description?: string;
}

export interface AskQuestion {
	readonly question: string;
	readonly multiSelect?: boolean;
	readonly options?: readonly AskOption[];
}

/** The answers of Jev by key: `pick_<i>` and `approval_<i>` (P(yes) as the `confidence`). */
export type AskAnswers = Record<string, Answer | undefined>;

const isPickable = (q: AskQuestion): boolean =>
	(q.options ?? []).length >= MIN_OPTIONS && !q.multiSelect;

/** The request of `ask` for the questions, or `undefined` when no question needs Jev. */
export const askRequest = (
	questions: readonly AskQuestion[],
): { state: object; questions: Record<string, unknown> } | undefined => {
	const picked = questions
		.map((q, i) => ({ q, i }))
		.filter(({ q }) => isPickable(q));
	if (picked.length === 0) {
		return undefined;
	}
	const state = Object.fromEntries(
		picked.map(({ q, i }) => [
			`question_${i}`,
			{
				question: q.question,
				options: Object.fromEntries(
					(q.options ?? []).map((o) => [o.label, o.description ?? ""]),
				),
			},
		]),
	);
	const asked = picked.flatMap(({ q, i }) => [
		[
			`pick_${i}`,
			{
				type: "choice",
				instructions: ASK_PICK({ index: String(i) }),
				criteria: Object.fromEntries(
					(q.options ?? []).map((o) => [o.label, o.description || o.label]),
				),
			},
		],
		[
			`approval_${i}`,
			{ type: "noul", instructions: ASK_APPROVAL({ index: String(i) }) },
		],
	]);
	return { state, questions: Object.fromEntries(asked) };
};

/** The pick for question `i`, or `undefined` when Jev is not sure, the pick is no option, or the question may be an approval. */
export const sureAnswer = (
	questions: readonly AskQuestion[],
	answers: AskAnswers,
	i: number,
): Answer | undefined => {
	const q = questions[i];
	const pick = answers[`pick_${i}`];
	const approval = answers[`approval_${i}`];
	const options = q?.options ?? [];
	if (
		q === undefined ||
		q.multiSelect ||
		questions.some((o, j) => j !== i && o.question === q.question) ||
		pick === undefined ||
		approval === undefined ||
		!(approval.confidence < APPROVAL_MAX) ||
		!(pick.confidence >= MIN_CONFIDENCE) ||
		!options.some((o) => o.label === pick.choice)
	) {
		return undefined;
	}
	return pick;
};

/** The questions with the note of Jev in the picked option of each sure question. */
export const withPicks = <Q extends AskQuestion>(
	questions: readonly Q[],
	answers: AskAnswers,
): Q[] =>
	questions.map((q, i) => {
		const pick = sureAnswer(questions, answers, i);
		if (pick === undefined) {
			return q;
		}
		const note = ASK_NOTE({ confidence: pick.confidence.toFixed(2) });
		return {
			...q,
			options: (q.options ?? []).map((o) =>
				o.label === pick.choice
					? {
							...o,
							description: o.description ? `${o.description} ${note}` : note,
						}
					: o,
			),
		};
	});

const asAnswer = (value: unknown): Answer | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}
	const { choice, confidence, noul } = value;
	// `noul` is P(yes), the `confidence` of the answer "yes".
	if (typeof noul === "number") {
		return isProbability(noul)
			? { choice: "yes", confidence: noul }
			: undefined;
	}
	return typeof choice === "string" && isProbability(confidence)
		? { choice, confidence }
		: undefined;
};

/** The answers of `ask` from the `answers` of the API. An entry that is no answer is `undefined`. */
export const answersOf = (value: unknown): AskAnswers | undefined => {
	if (!isRecord(value) || Array.isArray(value)) {
		return undefined;
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, v]) => [key, asAnswer(v)]),
	);
};
