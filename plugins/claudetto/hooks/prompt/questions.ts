/**
 * Every statement the pre-decide step asks and every note it adds to a prompt. The
 * judgments are statements a model rates (TypeSafe Noul: the probability the
 * statement is true); `decide.ts` holds the truth table that turns the rates
 * into notes. Wording changes here and nowhere else.
 */

import type { Statement } from "./judge";

/** One judgment: the statement a model rates and the note the prompt gets when the rating is a yes. */
export interface Judgment extends Statement {
	/** What the model reads beside the prompt when the judgment is a yes. */
	readonly note: string;
}

/** The judgments, in the order their notes are added. */
export const JUDGMENTS: readonly Judgment[] = [
	{
		id: "asks_verdict_only",
		statement:
			"`prompt` asks whether an idea or a proposed change is good, or for an opinion on it, and does not ask for the change to be made.",
		note: "The person asks for a verdict, not for a change. Read the files the idea touches, open the reply with the verdict and the file or line that settles it, and edit nothing."
	},
	{
		id: "states_checkable_fact",
		statement:
			"`prompt` states as settled a specific fact about the project or its files (a version, port, count, rate, path or name) that the person is relying on and that the files could contradict.",
		note: "The person states facts about the project as settled. Check each one against the files before you use it; where the files differ, use the files' value and say so in the first lines of the reply, naming the file."
	}
];

/** The longest prompt text sent to a model; the head holds the request. */
export const MAX_PROMPT_CHARS = 4000;

/** The state Jev reads: one field, so each statement can name it as `prompt`. */
export const stateOf = (text: string): { readonly prompt: string } => ({
	prompt: text.slice(0, MAX_PROMPT_CHARS)
});
