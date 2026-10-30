// The pick of Jev for a call of the decision tool: the request and the sure pick of each question.
// Jev picks for each question that has 2 or more options and is not multi-select, and only when a
// second yes or no question, `approval_<i>`, is a confident no. A pick is sure when its confidence
// reaches `MIN_CONFIDENCE`; the confidence is already measured above chance (`confidence.md`), so no
// second margin applies. Each question is keyed by its index, so two questions with the same text
// are still two decisions.

import { isProbability, isRecord } from "./api.ts";
import { APPROVAL_MAX, MIN_CONFIDENCE, MIN_OPTIONS } from "./limits.ts";
import { ASK_APPROVAL, ASK_PICK } from "./prompts.ts";

/** The chosen key, and its probability from 0 to 1. For a yes or no answer the key is `yes` and the probability is P(yes). */
export interface Answer {
	readonly choice: string;
	readonly confidence: number;
}

/** One option of a question put to Jev; the `description` is optional and is sent as an empty string when absent. */
export interface AskOption {
	readonly label: string;
	readonly description?: string;
}

/** A question as `AskUserQuestion` shapes it; `askRequest` skips one with `multiSelect` set or with fewer than `MIN_OPTIONS` options. */
export interface AskQuestion {
	readonly question: string;
	readonly multiSelect?: boolean;
	readonly options?: readonly AskOption[];
}

/**
 * The `questions` of the input of the registered decision tool, or `undefined` when the input does
 * not hold a list of them. The input of a registered tool is whatever the model sent, so each field
 * is checked here rather than trusted.
 */
export const questionsOfInput = (input: unknown): AskQuestion[] | undefined => {
	const sent = isRecord(input) ? input["questions"] : undefined;
	if (!Array.isArray(sent)) {
		return undefined;
	}
	const questions = sent.filter(
		(q): q is AskQuestion => isRecord(q) && typeof q["question"] === "string",
	);
	return questions.length === sent.length && questions.length > 0
		? questions
		: undefined;
};

/** The answers of Jev by key: `pick_<i>` and `approval_<i>` (P(yes) as the `confidence`). */
export type AskAnswers = Record<string, Answer | undefined>;

const isPickable = (q: AskQuestion): boolean =>
	(q.options ?? []).length >= MIN_OPTIONS && !q.multiSelect;

/** The request for the questions, or `undefined` when no question needs Jev. */
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

const asAnswer = (value: unknown): Answer | undefined => {
	if (!isRecord(value)) {
		return undefined;
	}
	const { choice, confidence, noul } = value;
	if (typeof noul === "number") {
		return isProbability(noul)
			? { choice: "yes", confidence: noul }
			: undefined;
	}
	return typeof choice === "string" && isProbability(confidence)
		? { choice, confidence }
		: undefined;
};

/** The answers from the `answers` of the API. An entry that is no answer is `undefined`. */
export const answersOf = (value: unknown): AskAnswers | undefined => {
	if (!isRecord(value) || Array.isArray(value)) {
		return undefined;
	}
	return Object.fromEntries(
		Object.entries(value).map(([key, v]) => [key, asAnswer(v)]),
	);
};
