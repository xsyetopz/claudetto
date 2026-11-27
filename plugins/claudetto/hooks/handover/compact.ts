import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { KEEP_LINE } from "./text";
import { isAutoOff, isOff, knob, writeHandover } from "./writer";

const AUTOMATIC = new Set(["auto", "precompute", "plugin"]);

// Core ends its own auto-compaction summary with this resume instruction (claude 2.1.329,
// `suppressFollowUpQuestions`); a handover that replaces the summary carries it too, or the model
// answers the handover and waits for a "continue". A `plugin` compaction runs at a turn boundary,
// after the model answered, so the next prompt is the user's and gets no resume line.
const RESUME =
	"Continue the conversation from where it left off without asking the user any further questions. Resume directly with the next step's tool call, as if the break never happened.";

/**
 * Answers main-loop automatic compactions with the handover so core makes no
 * summarizer call; a manual `/compact` keeps core's summary with the keep line.
 */
export function registerCompact(on: On): void {
	on("session.compact", async ($, e, next) => {
		if (e.agentId !== undefined || (await isOff($))) {
			return next(e);
		}
		// `precomputeHandoverEnabled: false` mirrors `precomputeCompactionEnabled`: core's own summary answers.
		const declined =
			e.trigger === "precompute" &&
			(await knob($, "precomputeHandoverEnabled")) === false;
		if (!AUTOMATIC.has(e.trigger) || declined || (await isAutoOff($))) {
			const instructions =
				e.instructions !== undefined && e.instructions !== ""
					? `${e.instructions}\n${KEEP_LINE}`
					: KEEP_LINE;
			return next({ ...e, instructions });
		}
		const handover = await writeHandover($);
		const text =
			e.trigger === "plugin" ? handover.text : `${handover.text}\n\n${RESUME}`;
		const { usage } = handover;
		const { context } = await $.session.usage();
		// Core rejects a hook's messages whose token counts are not numbers (RT-042).
		const zero = {
			input_tokens: 0,
			output_tokens: 0,
			cache_read_input_tokens: 0,
			cache_creation_input_tokens: 0
		};
		// A compaction at the turn's start already holds the new prompt; it stays
		// after the handover, with its engine handle, or the turn loses it.
		const last = e.messages.findLastIndex((m) => m.role === "assistant");
		const pending = e.messages.slice(last + 1);
		return {
			messages: [{ role: "user", text, toolUses: [] }, ...pending],
			tokensBefore: context.tokens ?? 0,
			tokensAfter: Math.ceil(text.length / 4),
			usage: usage ?? zero
		};
		// A failed handover leaves the compaction to core.
	}).catch(($, e, next) => {
		fault($, "handover", next.error);
		return next(e);
	});
}
