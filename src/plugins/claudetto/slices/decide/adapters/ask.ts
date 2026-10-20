// The `AskUserQuestion` adapter: it sends the questions to Jev through `ask`.
// When Jev is sure about each question, the outcome is the answers of the call.
// Otherwise the outcome is the questions with the picks added, and the user answers the dialog.
// A question that Jev is not sure to be no approval gets no pick and no note, and the user answers it.
// The run of the CLI is a parameter, so a test gives a fake run, and the hooks module gives `$.process.run`.
// Each failure gives `undefined`, so the question stays as Claude sent it, and the user answers it.

import {
  type AskQuestion,
  askRequest,
  parseAskAnswers,
  sureAnswer,
  withPicks,
} from "../domain/ask.ts";
import type { CliCall } from "../domain/request.ts";

/** The fields of a finished run that the adapter reads. */
export interface CliRun {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** The pick of Jev for one question of the call. */
export interface Picked {
  readonly question: string;
  readonly choice: string;
  readonly confidence: number;
}

/** What Jev gives for the call: `answered` when each question has a sure pick, else the `questions` with the picks added. */
export type Outcome<Q extends AskQuestion> =
  | { readonly answered: Picked[] }
  | { readonly questions: Q[] };

/** The outcome for the questions, or `undefined` when Jev gives no pick for them. */
export const judgeQuestions = async <Q extends AskQuestion>(
  questions: readonly Q[],
  runCli: (call: CliCall) => Promise<CliRun>,
): Promise<Outcome<Q> | undefined> => {
  if (!Array.isArray(questions)) return undefined;
  try {
    const request = askRequest(questions);
    if (request === null) return undefined;
    const run = await runCli({
      args: ["ask"],
      stdin: JSON.stringify(request),
    });
    if (run.exitCode !== 0) return undefined;
    const answers = parseAskAnswers(run.stdout);
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
    // The run can throw, such as when the process cannot start. The question then stays as asked.
    return undefined;
  }
};
