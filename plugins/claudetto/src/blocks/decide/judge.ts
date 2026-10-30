// A failure of the whole request gives no pick at all; the decision stays with the model.

import { type AskQuestion, answersOf, askRequest, sureAnswer } from "./ask.ts";
import {
	DECIDE_NO_PICK,
	DECIDE_PICKED,
	DECIDE_UNSURE,
	DECIDE_YOURS,
} from "./prompts.ts";

export interface Picked {
	readonly question: string;
	readonly choice: string;
	readonly confidence: number;
}

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

/** A question with no pick keeps its decision with the model; silence would read as a pick. */
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
