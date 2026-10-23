// The `AskUserQuestion` adapter: it sends the questions to Jev with one request.
// The call is a parameter, so a test gives a fake call. Each failure gives `undefined`, and the user answers the dialog.

import {
  type AskQuestion,
  answersOf,
  askRequest,
  sureAnswer,
  withPicks,
} from "../domain/ask.ts";

export interface Picked {
  readonly question: string;
  readonly choice: string;
  readonly confidence: number;
}

/** `answered` when each question has a sure pick, else the `questions` with the picks added. */
type Outcome<Q extends AskQuestion> =
  | { readonly answered: Picked[] }
  | { readonly questions: Q[] };

export const judgeQuestions = async <Q extends AskQuestion>(
  questions: readonly Q[],
  call: (request: { state: string; questions: object }) => Promise<unknown>,
): Promise<Outcome<Q> | undefined> => {
  if (!Array.isArray(questions)) return undefined;
  try {
    const request = askRequest(questions);
    if (request === null) return undefined;
    const answers = answersOf(await call(request));
    if (answers === undefined) return undefined;
    const picks = questions.map((_, i) => sureAnswer(questions, answers, i));
    if (picks.every((p) => p !== undefined))
      return {
        answered: picks.map((p, i) => ({
          question: questions[i]?.question ?? "",
          choice: p.choice,
          confidence: p.confidence,
        })),
      };
    return { questions: withPicks(questions, answers) };
  } catch {
    return undefined;
  }
};
