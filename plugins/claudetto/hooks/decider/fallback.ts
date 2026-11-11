import { type Answers, type QuestionSet, UNSETTLED } from "./questions.ts";

/** Every question of `set` as `unsettled`: the answer when no road gave one. */
export const unsettled = (set: QuestionSet): Answers =>
	Object.fromEntries(
		Object.keys(set.questions).map((name) => [name, UNSETTLED]),
	);
