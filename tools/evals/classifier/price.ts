// A ceiling, not a reading: every input token is priced as a 5-minute cache write, the dearest rate a
// request can pay, every reply as long as its `max_tokens` allows, and the built-in arms always pay stage 2.

import { CHARS_PER_TOKEN } from "../../../claudekit/compaction-cost/transcripts/transcripts.ts";
import { costOf } from "../../../claudekit/price/cost.ts";
import { classifierRules } from "../../../plugins/claudetto/src/blocks/classify/prompt.ts";
import type { ClassifierArm } from "./arms.ts";

/** The characters of a built-in classifier request outside its rules text, read with `just capture --classifier`. */
const REQUEST_OVERHEAD_CHARS = 140_718 - 140_015;

/** The rules text of the built-in classifier, and of the claudetto suite in its place. */
const BUILT_IN_RULES_CHARS = 140_015;
const SUITE_RULES_CHARS = 66_362;

/** The model, request size, and reply caps of the classifier requests one action costs in an arm. */
export interface ArmRequest {
	readonly model: string;
	readonly chars: number;
	/** One cap per request: two stages for the built-in classifier, one call for the hook. */
	readonly outputTokens: readonly number[];
}

/**
 * The built-in classifier runs on `claude-sonnet-5` whatever the session's model, and each cap is the
 * `max_tokens` of a request forwarded by `just eval --classifier --run` against a fake upstream.
 * The hook's cap is its own 200 plus the thinking budget the plugin runtime adds.
 */
export const armRequest = (arm: ClassifierArm): ArmRequest => {
	if (arm === "built-in" || arm === "suite") {
		const rules = arm === "built-in" ? BUILT_IN_RULES_CHARS : SUITE_RULES_CHARS;
		return {
			model: "claude-sonnet-5",
			chars: rules + REQUEST_OVERHEAD_CHARS,
			outputTokens: [64, 8192],
		};
	}
	return {
		model: arm === "haiku" ? "claude-haiku-5-5" : "claude-sonnet-5-5",
		chars: classifierRules().length + REQUEST_OVERHEAD_CHARS,
		outputTokens: [2248],
	};
};

/** The dollars one session of `arm` is estimated to cost; the scripted agent is free. */
export const sessionUsd = (arm: ClassifierArm): number => {
	const request = armRequest(arm);
	let usd = 0;
	for (const cap of request.outputTokens) {
		usd += costOf(request.model, {
			cache_creation_input_tokens: Math.ceil(request.chars / CHARS_PER_TOKEN),
			output_tokens: cap,
		});
	}
	return usd;
};
