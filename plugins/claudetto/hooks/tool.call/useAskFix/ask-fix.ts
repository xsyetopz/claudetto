import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain.ts";
import { askFixQuestions } from "../../decider/questions.ts";
import { anyYes } from "../../decider/settle.ts";
import { ASK_FIX_DENIED } from "../../texts-gate.ts";
import { ASK_TOOL } from "../../verify.ts";

/** Denies an `AskUserQuestion` call when one Decider call answers `yes` for any of its questions. A `no`, an `unsettled` answer, and a Decider that fails let the call through. */
export async function askFixCall(
	$: EngineInterface,
	e: CallEvent,
	next: CallNext,
): Promise<Awaited<CallAnswer>> {
	if (e.tool !== ASK_TOOL || e.questions.length === 0) {
		return next(e);
	}
	const state = {
		questions: e.questions
			.map(
				(q, i) =>
					`${i + 1}. ${q.question} Options: ${q.options.map((o) => o.label).join("; ")}`,
			)
			.join("\n"),
	};
	return (await anyYes($, askFixQuestions(e.questions.length), state))
		? { deny: ASK_FIX_DENIED }
		: next(e);
}
