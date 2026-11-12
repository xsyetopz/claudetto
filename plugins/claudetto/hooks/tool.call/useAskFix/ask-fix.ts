import type { EngineInterface } from "claude-code";

import type { CallAnswer, CallEvent, CallNext } from "../../chain.ts";
import { askFixQuestions } from "../../decider/questions.ts";
import { redactedState } from "../../decider/redact.ts";
import { settle } from "../../decider/settle.ts";
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
	// The fallback model reads the state as given, and a setup question can show a secret, so it is redacted first; a scanner that fails leaves the call to its own secret guard.
	const safe = await redactedState($, state).catch(() => null);
	if (safe === null) {
		return next(e);
	}
	const answers = await settle($, askFixQuestions(e.questions.length), safe);
	return Object.values(answers).includes("yes")
		? { deny: ASK_FIX_DENIED }
		: next(e);
}
