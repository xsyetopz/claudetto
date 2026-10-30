// The judgment of the questions of one call and the reply the model reads. The call is a parameter,
// so a test gives a fake one. A failure of the whole request gives no pick at all, and the decision
// stays with the model.

import { type AskQuestion, answersOf, askRequest, sureAnswer } from "./ask.ts";
import {
	DECIDE_NO_PICK,
	DECIDE_PICKED,
	DECIDE_UNSURE,
	DECIDE_YOURS,
} from "./prompts.ts";

/** A question with the pick Jev was sure of, as `sureAnswer` accepts it; `confidence` is from 0 to 1. */
export interface Picked {
	readonly question: string;
	readonly choice: string;
	readonly confidence: number;
}

/** The pick of each question, `undefined` where Jev is not sure, or `undefined` for all when the request has none or fails. */
export const judgeQuestions = async (
	questions: readonly AskQuestion[],
	call: (request: { state: object; questions: object }) => Promise<unknown>,
): Promise<(Picked | undefined)[] | undefined> => {
	try {
		const request = askRequest(questions);
		if (request === undefined) {
			return undefined;
		}
		const answers = answersOf(await call(request));
		if (answers === undefined) {
			return undefined;
		}
		return questions.map((q, i) => {
			const pick = sureAnswer(questions, answers, i);
			return pick === undefined
				? undefined
				: {
						question: q.question,
						choice: pick.choice,
						confidence: pick.confidence,
					};
		});
	} catch {
		return undefined;
	}
};

/**
 * The text the tool returns: one line for each question, its pick with the confidence or the line
 * that Jev is unsure. A question with no pick keeps its decision with the model, so the tail says
 * so. Silence would read as a pick.
 */
export const replyOf = (
	questions: readonly AskQuestion[],
	picks: readonly (Picked | undefined)[] | undefined,
): string => {
	if (picks === undefined) {
		return DECIDE_NO_PICK;
	}
	const lines = questions.map((q, i) => {
		const pick = picks[i];
		return pick === undefined
			? DECIDE_UNSURE({ question: q.question })
			: DECIDE_PICKED({ ...pick, confidence: pick.confidence.toFixed(2) });
	});
	return picks.every((p) => p !== undefined)
		? lines.join("\n")
		: [...lines, DECIDE_YOURS].join("\n");
};
