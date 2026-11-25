import type {
	EngineInterface,
	PluginOptions,
	PromptSubmitInput
} from "claude-code";

import { fault } from "../shared/fault";
import { effortOf, rate, type Ratings, read } from "./judge";
import { JUDGMENTS, stateOf } from "./questions";

export { NO_AT, read, YES_AT } from "./judge";

/**
 * The truth table: each judgment that reads yes adds its note; a no or an
 * unsettled rating adds nothing, so an uncertain model never changes a prompt.
 * A missing rating is unsettled.
 */
export const decide = (ratings: Ratings): string[] =>
	JUDGMENTS.filter((j) => read(ratings[j.id] ?? 0.5) === "yes").map(
		(j) => j.note
	);

/** The submitters whose text a person wrote; machine messages are not judged. */
const PERSON = new Set(["composer", "bridge", "sdk"]);

/**
 * The pre-decide step: Jev rates each judgment of a submitted prompt; code turns
 * the ratings into notes the model reads beside the prompt. A failed Jev call
 * routes to the fallback model, never to a "no". Without `TYPESAFE_API_KEY` the
 * step is off and nothing leaves the machine. A prompt no rating settles, or
 * one both services fail on, passes unchanged.
 *
 * The secret guard's `prompt.submit` hook calls it after its own check: the
 * host allows one unmatched hook per event, and a prompt that holds a
 * credential must be dropped before any text goes to a third party.
 */
export async function withNotes(
	$: EngineInterface,
	e: PromptSubmitInput,
	options: PluginOptions = {}
): Promise<PromptSubmitInput> {
	const text = e.text.trim();
	if (
		e.command !== undefined ||
		e.isMeta === true ||
		!PERSON.has(e.origin.kind) ||
		text.length < 12
	) {
		return e;
	}
	const model = options["deciderModel"];
	let ratings: Ratings | undefined;
	try {
		ratings = await rate($, "pre-decide", {
			statements: JUDGMENTS,
			state: stateOf(text),
			effort: effortOf(options["deciderEffort"]),
			...(typeof model === "string" && model !== "" ? { model } : {})
		});
	} catch (error) {
		fault($, "pre-decide", error);
		return e;
	}
	const notes = ratings === undefined ? [] : decide(ratings);
	return notes.length === 0
		? e
		: { ...e, context: [...(e.context ?? []), ...notes] };
}
