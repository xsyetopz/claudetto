import type { TurnUsage } from "claude-code";
import { HAIKU_MODEL, HAIKU_PRICE_STEP } from "../../tiers/tiers.ts";

// Haiku 5.5 counts about 30% more tokens than Haiku 4.5 for the same text, so 3 errs toward withholding where 4 would let a result cross.
const CHARS_PER_TOKEN = 3;

/** A result's tokens as estimated from its characters. */
export const tokensOf = (chars: number): number =>
	Math.ceil(chars / CHARS_PER_TOKEN);

/** Whether a result is withheld, its estimated tokens, and with a withhold the next request's estimated total. */
export type Bound =
	| { readonly withhold: false; readonly tokens: number }
	| {
			readonly withhold: true;
			readonly tokens: number;
			readonly total: number;
	  };

const promptOf = (usage: TurnUsage): number =>
	usage.input_tokens +
	usage.cache_read_input_tokens +
	usage.cache_creation_input_tokens +
	usage.output_tokens;

/** Bounds a result of `chars` against the step that made the call, after the `passed` tokens of that step's results that went through. */
export const boundOf = (
	usage: TurnUsage | null,
	passed: number,
	chars: number,
): Bound => {
	const tokens = tokensOf(chars);
	if (usage === null || !usage.model.startsWith(HAIKU_MODEL)) {
		return { withhold: false, tokens };
	}
	const total = promptOf(usage) + passed + tokens;
	return total > HAIKU_PRICE_STEP
		? { withhold: true, tokens, total }
		: { withhold: false, tokens };
};
